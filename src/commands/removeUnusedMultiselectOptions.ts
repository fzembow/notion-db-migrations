import { notionClient } from "../notionClient";
import { QueryDatabaseFilter } from "../types";
import { databaseQueryAll } from "../utils";

/**
 *  Remove unused multi_select values
 */
export const removeUnusedMultiselectOptions = async ({
  dbId,
  multiSelectPropertyName,
}: {
  dbId: string;
  multiSelectPropertyName: string;
}) => {
  const db = await notionClient.databases.retrieve({ database_id: dbId });
  const prop = db.properties[multiSelectPropertyName];
  if (prop.type !== "multi_select") {
    throw new Error(
      `${multiSelectPropertyName} is not a multi_select property`
    );
  }

  const unusedOptionIds: string[] = [];
  const options = prop.multi_select.options;
  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    const name = option.name;
    const filter: QueryDatabaseFilter = {
      property: multiSelectPropertyName,
      multi_select: {
        contains: name,
      },
    };
    const pages = await databaseQueryAll({ dbId, filter });
    if (pages.length === 0) {
      unusedOptionIds.push(option.id!);
    }
  }

  const inUseOptions = options.filter((o) => !unusedOptionIds.includes(o.id!));
  await notionClient.databases.update({
    database_id: dbId,
    properties: {
      [multiSelectPropertyName]: {
        multi_select: {
          options: inUseOptions,
        },
      },
    },
  });
};
