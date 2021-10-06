import { notionClient } from "../notionClient";
import { QueryDatabaseFilter } from "../types";
import { databaseQueryAll } from "../utils";
import { removeMultiselectOptions } from "./removeMultiselectOptions";

/**
 *  Merge two or more multiselect values to the same one
 */
export const mergeMultiselectValues = async ({
  dbId,
  multiSelectPropertyName,
  inputNames,
  outputName,
}: {
  dbId: string;
  multiSelectPropertyName: string;
  inputNames: string[];
  outputName: string;
}) => {
  const db = await notionClient.databases.retrieve({ database_id: dbId });
  const prop = db.properties[multiSelectPropertyName];
  if (prop.type !== "multi_select") {
    throw new Error(
      `${multiSelectPropertyName} is not a multi_select property`
    );
  }

  const outputOption = prop.multi_select.options.find(
    (o) => o.name === outputName
  );
  if (!outputOption) {
    throw new Error(
      `${outputName} is not a valid option for ${multiSelectPropertyName}.`
    );
  }

  const orStatement = inputNames.map((name) => ({
    property: multiSelectPropertyName,
    multi_select: {
      contains: name,
    },
  }));
  const filter: QueryDatabaseFilter = { or: orStatement };
  const pages = await databaseQueryAll({ dbId, filter });

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const multiSelectProp = page.properties[multiSelectPropertyName];
    if (multiSelectProp.type !== "multi_select") {
      throw new Error(
        `${multiSelectPropertyName} is not a multi_select property`
      );
    }

    // Remove any of the values we are mapping _from_
    const options = multiSelectProp.multi_select.filter(
      (o) => !inputNames.includes(o.name)
    );

    // Add the new value if it was not already present
    if (!options.some((o) => o.name === outputName)) {
      options.push({
        name: outputName,
        id: outputOption.id!,
        color: outputOption.color!,
      });
    }

    await notionClient.pages.update({
      page_id: page.id,
      properties: {
        [multiSelectPropertyName]: options,
      },
    });
  }

  // We can now remove the options since they will no longer appear anywhere.
  const optionNamesToRemove = inputNames.filter((name) => name !== outputName);
  await removeMultiselectOptions({
    dbId,
    multiSelectPropertyName,
    optionNamesToRemove,
  });
};
