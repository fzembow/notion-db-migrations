import { notionClient } from "../notionClient";

/**
 *  Remove named multi_select values
 */
export const removeMultiselectOptions = async ({
  dbId,
  multiSelectPropertyName,
  optionNamesToRemove,
}: {
  dbId: string;
  multiSelectPropertyName: string;
  optionNamesToRemove: string[];
}) => {
  const db = await notionClient.databases.retrieve({ database_id: dbId });
  const prop = db.properties[multiSelectPropertyName];
  if (prop.type !== "multi_select") {
    throw new Error(
      `${multiSelectPropertyName} is not a multi_select property`
    );
  }

  const options = prop.multi_select.options;
  const remainingOptions = options.filter(
    (o) => !optionNamesToRemove.includes(o.name)
  );
  await notionClient.databases.update({
    database_id: dbId,
    properties: {
      [multiSelectPropertyName]: {
        multi_select: {
          options: remainingOptions,
        },
      },
    },
  });
};
