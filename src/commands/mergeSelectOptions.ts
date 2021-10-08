import { Client } from "@notionhq/client/build/src";
import { Command } from "commander";
import { getNotionClient } from "../notionClient";
import { QueryDatabaseFilter, SelectChoice } from "../types";
import { databaseQueryAll } from "../utils/notion";
import { removeSelectOptions } from "./removeSelectOptions";

const registerCommand = (program: Command) => {
  program
    .command("merge-select-options")
    .description(
      "merge options in a select or multi_select property in a database"
    )
    .requiredOption(
      "--db-id <database-id>",
      "The ID of the notion database whose pages shall be archived."
    )
    .requiredOption(
      "--property <property>",
      "The name of the property in which the choices should be merged."
    )
    .requiredOption(
      "--output-option <output-option>",
      "The desired option name."
    )
    .requiredOption(
      "--input-options <input-options...>",
      "The options to be merged into the output name."
    )
    .action(
      async ({
        dbId,
        property: propertyName,
        outputOption: outputOptionName,
        inputOptions: inputOptionNames,
      }) => {
        await mergeSelectOptions({
          client: getNotionClient(program),
          dbId,
          propertyName,
          outputOptionName,
          inputOptionNames,
        });
      }
    );
};

type Args = {
  client: Client;
  dbId: string;
  propertyName: string;
  inputOptionNames: string[];
  outputOptionName: string;
};

/**
 *  Merge two or more select or multi_select values to the same one
 */
export const mergeSelectOptions = async ({
  client,
  dbId,
  propertyName,
  inputOptionNames,
  outputOptionName,
}: Args) => {
  const db = await client.databases.retrieve({ database_id: dbId });
  const prop = db.properties[propertyName];
  let outputOption: SelectChoice | undefined;
  if (prop.type === "multi_select") {
    outputOption = prop.multi_select.options.find(
      (o) => o.name === outputOptionName
    );
  } else if (prop.type === "select") {
    outputOption = prop.select.options.find((o) => o.name === outputOptionName);
  } else {
    throw new Error(`${propertyName} is not a select or multi_select property`);
  }

  if (!outputOption) {
    throw new Error(
      `${outputOptionName} is not a valid option for ${propertyName}.`
    );
  }

  const orStatement = inputOptionNames.map((name) => ({
    property: propertyName,
    [prop.type]: {
      contains: name,
    },
  }));
  // @ts-ignore
  const filter: QueryDatabaseFilter = { or: orStatement };
  const pages = await databaseQueryAll({ client, dbId, filter });

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const selectProp = page.properties[propertyName];
    if (selectProp.type !== prop.type) {
      throw new Error(
        `${propertyName} is not a select or multi_select property`
      );
    }

    // Remove any of the values we are mapping _from_
    // @ts-ignore
    const options: SelectChoice[] = selectProp[prop.type].filter(
      (o: SelectChoice) => !inputOptionNames.includes(o.name)
    );

    // Add the new value if it was not already present
    if (!options.some((o) => o.name === outputOptionName)) {
      options.push({
        name: outputOption.name,
        id: outputOption.id,
        color: outputOption.color,
      });
    }

    await client.pages.update({
      page_id: page.id,
      properties: {
        [propertyName]: options,
      },
    });
  }

  // We can now remove the options since they will no longer appear anywhere.
  const optionsToRemove = inputOptionNames.filter(
    (name) => name !== outputOptionName
  );
  await removeSelectOptions({
    client,
    dbId,
    propertyName,
    optionsToRemove,
  });
};

export default registerCommand;
