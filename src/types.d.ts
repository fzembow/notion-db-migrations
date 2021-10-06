import {
  QueryDatabaseParameters,
  QueryDatabaseResponse,
} from "@notionhq/client/build/src/api-endpoints";

export type QueryDatabaseFilter = QueryDatabaseParameters["filter"];
export type QueryDatabaseResults = QueryDatabaseResponse["results"];

// TODO: Take this from the library, if it exports it
export type SelectChoice = {
  id?: string;
  name?: string;
  color?:
    | "default"
    | "gray"
    | "brown"
    | "orange"
    | "yellow"
    | "green"
    | "blue"
    | "purple"
    | "pink"
    | "red";
};
