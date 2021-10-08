import { Client } from "@notionhq/client/build/src";
import { QueryDatabaseResponse } from "@notionhq/client/build/src/api-endpoints";
import { QueryDatabaseFilter, QueryDatabaseResults } from "../types";

/**
 * Run a database query, but return all results, following the cursor
 */
export const databaseQueryAll = async ({
  client,
  dbId,
  filter,
}: {
  client: Client;
  dbId: string;
  filter?: QueryDatabaseFilter;
}): Promise<QueryDatabaseResults> => {
  const results: QueryDatabaseResults = [];
  let cursor: string | null | undefined = undefined;
  do {
    const res: QueryDatabaseResponse = await client.databases.query({
      database_id: dbId,
      start_cursor: cursor,
      filter,
    });
    results.push(...res.results);

    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor != null);
  return results;
};

/**
 * Creates a page in the specified database with the given title,
 * returning the newly created page's id
 */
export const createPage = async ({
  client,
  dbId,
  title,
  titlePropertyName,
}: {
  client: Client;
  dbId: string;
  title: string;
  titlePropertyName: string;
}): Promise<string> => {
  const res = await client.pages.create({
    parent: {
      database_id: dbId,
    },
    properties: {
      [titlePropertyName]: {
        title: [
          {
            text: {
              content: title,
            },
          },
        ],
      },
    },
  });
  return res.id;
};
