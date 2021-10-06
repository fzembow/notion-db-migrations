import {
  GetDatabaseResponse,
  QueryDatabaseParameters,
  QueryDatabaseResponse,
} from "@notionhq/client/build/src/api-endpoints";

export type QueryDatabaseFilter = QueryDatabaseParameters["filter"];
export type QueryDatabaseResults = QueryDatabaseResponse["results"];

export type SelectProperty = Extract<
  GetDatabaseResponse["properties"][string],
  { type: "select" }
>;

export type SelectChoice = SelectProperty["select"]["options"];

export type MultiSelectProperty = Extract<
  GetDatabaseResponse["properties"][string],
  { type: "multi_select" }
>;
