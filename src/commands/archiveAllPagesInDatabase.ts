import { Client } from "@notionhq/client/build/src";
import { Command } from "commander";
import { getNotionClient } from "../notionClient";
import { databaseQueryAll } from "../utils";

const registerCommand = (program: Command) => {
  program
    .command("archive-all-pages-in-db")
    .description("archive all pages in a database")
    .option(
      "--db-id <database-id>",
      "The ID of the notion database whose pages shall be archived."
    )
    .action(async ({ dbId }) => {
      await archiveAllPagesInDb({ dbId, client: getNotionClient(program) });
    });
};

type Args = {
  dbId: string;
  client: Client;
};

/**
 * Archives all pages in a database
 */
const archiveAllPagesInDb = async ({ dbId, client }: Args) => {
  const results = await databaseQueryAll({ dbId, client });
  for (let i = 0; i < results.length; i++) {
    const pageId = results[i].id;
    await client.pages.update({
      page_id: pageId,
      archived: true,
    });
  }
};

export default registerCommand;
