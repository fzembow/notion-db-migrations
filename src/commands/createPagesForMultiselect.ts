import { Client } from "@notionhq/client/build/src";
import { createPage } from "../utils/notion";

type Args = {
  client: Client;
  srcDbId: string;
  tgtDbId: string;
  multiSelectPropertyName: string;
  targetDbTitlePropertyName: string;
};

export const makePagesFromMultiselect = ({}) => {
  throw Error("TODO: Connect me");
};

/**
 * Creates a page in `tgtDb` for each value of `propertyName`
 * within `srcDb`
 */
const createPagesForMultiselect = async ({
  client,
  srcDbId,
  tgtDbId,
  multiSelectPropertyName,
  targetDbTitlePropertyName = "Feature",
}: Args): Promise<Record<string, string>> => {
  const srcDb = await client.databases.retrieve({ database_id: srcDbId });

  const labelProp = srcDb.properties[multiSelectPropertyName];
  if (labelProp.type !== "multi_select") {
    throw new Error("Expected the Label prop to be a multi_select");
  }
  const labels = labelProp.multi_select.options.map((o) => o.name);

  const labelPageIdMap: Record<string, string> = {};

  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    const pageId = await createPage({
      client,
      dbId: tgtDbId,
      title: label,
      titlePropertyName: targetDbTitlePropertyName,
    });
    labelPageIdMap[label] = pageId;
  }
  return labelPageIdMap;
};

import { databaseQueryAll } from "../utils";

/**
 *  Map multiselect values into a relation
 */
const setRelationFromMultiselect = async ({
  client,
  dbId,
  relationPropertyName,
  multiSelectPropertyName,
  relatedDbId,
  relatedDbTitlePropertyName,
}: {
  client: Client;
  dbId: string;
  multiSelectPropertyName: string;
  relationPropertyName: string;

  relatedDbId: string;
  relatedDbTitlePropertyName: string;
}) => {
  const titlePageIdMap = await getPageTitleIdMapping({
    client,
    dbId: relatedDbId,
    titlePropertyName: relatedDbTitlePropertyName,
  });

  const pages = await databaseQueryAll({ client, dbId });
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const multiSelectProp = page.properties[multiSelectPropertyName];
    if (multiSelectProp.type !== "multi_select") {
      throw new Error(
        `${multiSelectPropertyName} is not a multi_select property`
      );
    }

    const values = multiSelectProp.multi_select.map((o) => o.name);
    await client.pages.update({
      page_id: page.id,
      properties: {
        [relationPropertyName]: values.map((v) => ({ id: titlePageIdMap[v] })),
      },
    });
  }
};

/**
 * Gets the mapping of page title to page ID, suitable for further user
 * to set up relations by title instead of ID.
 */
const getPageTitleIdMapping = async ({
  client,
  dbId,
  titlePropertyName,
}: {
  client: Client;
  dbId: string;
  titlePropertyName: string;
}): Promise<Record<string, string>> => {
  const results = await databaseQueryAll({ client, dbId });
  const map: Record<string, string> = {};
  results.forEach((page) => {
    const titleProperty = page.properties[titlePropertyName];
    if (titleProperty.type !== "title") {
      throw new Error(
        `${titlePropertyName} is not a "title" property in database ${dbId}`
      );
    }
    const title = titleProperty.title[0].plain_text;
    map[title] = page.id;
  });
  return map;
};
