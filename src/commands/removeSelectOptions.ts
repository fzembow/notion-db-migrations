import { Client } from "@notionhq/client/build/src";
import { Command } from "commander";
import { getNotionClient } from "../notionClient";

const registerCommand = (program: Command) => {
  program
    .command("remove-select-options")
    .description(
      "remove options from a select or multi_select property in a database"
    )
    .requiredOption(
      "--db-id <database-id>",
      "The ID of the notion database whose pages shall be archived."
    )
    .requiredOption(
      "--property <property>",
      "The name of the property from which options should be removed."
    )
    .requiredOption("--options <options...>", "The options to be removed.")
    .action(
      async ({ dbId, property: propertyName, options: optionsToRemove }) => {
        await removeSelectOptions({
          client: getNotionClient(program),
          dbId,
          propertyName,
          optionsToRemove,
        });
      }
    );
};

type Args = {
  client: Client;
  dbId: string;
  propertyName: string;
  optionsToRemove: string[];
};

/**
 *  Remove named select or multi_select values
 */
export const removeSelectOptions = async ({
  client,
  dbId,
  propertyName,
  optionsToRemove,
}: Args) => {
  const db = await client.databases.retrieve({ database_id: dbId });
  const prop = db.properties[propertyName];
  if (prop.type === "multi_select") {
    const propOptions = prop.multi_select.options;
    const remainingOptions = propOptions.filter(
      (o) => !optionsToRemove.includes(o.name)
    );
    await client.databases.update({
      database_id: dbId,
      properties: {
        [propertyName]: {
          multi_select: {
            options: remainingOptions,
          },
        },
      },
    });
  } else if (prop.type === "select") {
    const propOptions = prop.select.options;
    const remainingOptions = propOptions.filter(
      (o) => !optionsToRemove.includes(o.name)
    );
    await client.databases.update({
      database_id: dbId,
      properties: {
        [propertyName]: {
          select: {
            options: remainingOptions,
          },
        },
      },
    });
  } else {
    throw new Error(`${propertyName} is not a select or multi_select property`);
  }
};

export default registerCommand;
