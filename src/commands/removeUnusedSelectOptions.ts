import { Client } from "@notionhq/client/build/src";
import { Command } from "commander";
import { getNotionClient } from "../notionClient";
import { QueryDatabaseFilter, SelectChoice } from "../types";
import { databaseQueryAll } from "../utils";
import { removeSelectOptions } from "./removeSelectOptions";

const registerCommand = (program: Command) => {
  program
    .command("remove-unused-select-options")
    .description(
      "merge options in a select or multi_select property in a database"
    )
    .requiredOption(
      "--db-id <database-id>",
      "The ID of the notion database to modify."
    )
    .requiredOption(
      "--property <property>",
      "The name of the property from which unused choices should be removed."
    )
    .action(async ({ dbId, property: propertyName }) => {
      await removeUnusedSelectOptions({
        client: getNotionClient(program),
        dbId,
        propertyName,
      });
    });
};

type Args = {
  client: Client;
  dbId: string;
  propertyName: string;
};

/**
 *  Remove unused multi_select values
 */
export const removeUnusedSelectOptions = async ({
  client,
  dbId,
  propertyName,
}: Args) => {
  const db = await client.databases.retrieve({ database_id: dbId });
  const prop = db.properties[propertyName];
  if (prop.type !== "multi_select" && prop.type !== "select") {
    throw new Error(`${propertyName} is not a select or multi_select property`);
  }

  const unusedOptionNames: string[] = [];
  // @ts-ignore
  const options: SelectChoice[] = prop[prop.type].options;
  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    const name = option.name;
    const filter: QueryDatabaseFilter = {
      property: propertyName,
      multi_select: {
        contains: name,
      },
    };
    const pages = await databaseQueryAll({ client, dbId, filter });
    if (pages.length === 0) {
      unusedOptionNames.push(option.name);
    }
  }

  await removeSelectOptions({
    client,
    dbId,
    propertyName,
    optionsToRemove: unusedOptionNames,
  });
};

export default registerCommand;
