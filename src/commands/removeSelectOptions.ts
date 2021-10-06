import { Client } from "@notionhq/client/build/src";
import { Command } from "commander";
import { getNotionClient } from "../notionClient";

const registerCommand = (program: Command) => {
  program
    .command("remove-select-options")
    .description(
      "remove options from a select or multi_select property in a database"
    )
    .option(
      "--db-id <database-id>",
      "The ID of the notion database whose pages shall be archived."
    )
    .option(
      "--property-name <property-name>",
      "The property from which options should be removed."
    )
    .option("--option <options...>", "The options to be removed.")
    .action(async ({ dbId, propertyName, options }) => {
      await removeSelectOptions({
        client: getNotionClient(program),
        dbId,
        propertyName,
        options,
      });
    });
};

type Args = {
  client: Client;
  dbId: string;
  propertyName: string;
  options: string[];
};

/**
 *  Remove named multi_select values
 */
export const removeSelectOptions = async ({
  client,
  dbId,
  propertyName,
  options: optionsToRemove,
}: Args) => {
  const db = await client.databases.retrieve({ database_id: dbId });
  const prop = db.properties[propertyName];
  if (prop.type !== "multi_select") {
    // TODO: Add select support
    throw new Error(`${propertyName} is not a multi_select property`);
  }

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
};

export default registerCommand;
