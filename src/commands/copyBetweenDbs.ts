import { Client } from "@notionhq/client/build/src";
import {
  CreatePageParameters,
  GetDatabaseResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { Command } from "commander";
import { getNotionClient } from "../notionClient";
import { databaseQueryAll } from "../utils/notion";

const registerCommand = (program: Command) => {
  program
    .command("copy-between-dbs")
    .description("Copies pages between Notion databases.")
    .requiredOption(
      "--db-id <database-id>",
      "The ID of the source Notion database."
    )
    .requiredOption(
      "--target-db-id <target-db-id>",
      "The ID of the target Notion database."
    )
    .action(async ({ dbId, targetDbId: tgtDbId }) => {
      await copyBetweenDbs({
        client: getNotionClient(program),
        dbId,
        tgtDbId,
      });
    });
};

type Args = {
  client: Client;
  dbId: string;
  tgtDbId: string;
};

const copyBetweenDbs = async ({ client, dbId, tgtDbId }: Args) => {
  let srcDb: GetDatabaseResponse;
  try {
    srcDb = await client.databases.retrieve({ database_id: dbId });
  } catch {
    throw new Error(`Source database with id ${dbId} does not exist.`);
  }

  let tgtDb: GetDatabaseResponse;
  try {
    tgtDb = await client.databases.retrieve({ database_id: tgtDbId });
  } catch {
    throw new Error(`Target database with id ${tgtDbId} does not exist.`);
  }

  // Compare the properties on the two databases, to ensure they are the same.
  const srcProps = new Set(Object.keys(srcDb.properties));
  const targetProps = new Set(Object.keys(tgtDb.properties));

  // Props in both source and target need to match types
  const commonProps = new Set([...srcProps].filter((p) => targetProps.has(p)));
  for (const propName of commonProps) {
    const srcProp = srcDb.properties[propName];
    const tgtProp = tgtDb.properties[propName];
    if (srcProp.type !== tgtProp.type) {
      // TODO: It's possible to "upgrade" a select into a multi_select, add support for that.
      throw new Error(
        `Target property ${propName} is of type ${tgtProp.type} but source is ${srcProp.type}.`
      );
    }
  }

  // Props only in the source need to be created
  const propsOnlyInSrc = new Set(
    [...srcProps].filter((p) => !targetProps.has(p))
  );
  if (propsOnlyInSrc.size) {
    const newProps = Array.from(propsOnlyInSrc)
      .map((p) => srcDb.properties[p])
      // Ignore the title prop since we will map it to the target DB's title
      .filter((p) => p.type !== "title");

    // TODO: Why does this have to be run twice to work? Wack.
    // If not done, the property is created, but its name is set to "0".
    await client.databases.update({
      database_id: tgtDbId,
      // @ts-ignore
      properties: newProps,
    });
    await client.databases.update({
      database_id: tgtDbId,
      // @ts-ignore
      properties: newProps,
    });
  }

  // Refresh the target db since we changed it up
  tgtDb = await client.databases.retrieve({ database_id: tgtDbId });

  // We need to map the title property from the source db pages to that of the target
  // so that we don't create title-less properties.
  let srcTitlePropName = getTitlePropName(srcDb);
  let tgtTitlePropName = getTitlePropName(tgtDb);

  // Create copies of each page
  const pages = await databaseQueryAll({ client, dbId });
  for (let i = 0; i < pages.length; i++) {
    // TODO: This should be CreatePageParameters, I am being lazy
    const page = pages[i];
    const { properties } = page;

    // Remove id and color from any select or multi_select choice being mapped,
    // so that they can re-associate by name with the equivalent choice on the
    // target
    Object.keys(properties).forEach((propName) => {
      const prop = properties[propName];
      if (prop.type === "select" && prop.select != null) {
        // @ts-ignore
        delete prop.select.color;
        // @ts-ignore
        delete prop.select.id;
      } else if (prop.type === "multi_select" && prop.multi_select != null) {
        for (const option of prop.multi_select) {
          // @ts-ignore
          delete option.color;
          // @ts-ignore
          delete option.id;
        }
      }
    });

    if (srcTitlePropName !== tgtTitlePropName) {
      properties[tgtTitlePropName] = properties[srcTitlePropName];
      delete properties[srcTitlePropName];
    }

    // TODO: Re-enable me!
    const newPage = await client.pages.create({
      parent: { database_id: tgtDb.id },
      properties,
    });

    const { id: newPageId } = newPage;
    await copyBlockChildren(client, page.id, newPageId);
  }
};

const copyBlockChildren = async (
  client: Client,
  srcPageId: string,
  tgtPageId: string
) => {
  const srcBlocks = await client.blocks.children.list({
    block_id: srcPageId,
  });

  if (srcBlocks.has_more) {
    throw new Error(
      "Listing blocks with more than 100 children is not currently supported"
    );
  }

  for (const srcBlock of srcBlocks.results) {
    console.log("\n\nCOPYING:\n\n");
    console.log(srcBlock);
    // TODO: This will fail on image blocks. It seems that
    // the File object returned from Notion will show the notion-
    // uploaded URL (signed aws url) while you can only create
    // external URLs. We could do something crazy like download the notion
    // file, upload it to s3, and then put it back in notion...
    const newTgtBlock = await client.blocks.children.append({
      block_id: tgtPageId,
      // @ts-ignore
      children: [srcBlock],
    });
  }

  // This is just a test of creating blocks
  // await client.blocks.children.append({
  //   block_id: tgtPageId,
  //   children: [
  //     {
  //       object: "block",
  //       type: "heading_2",
  //       heading_2: {
  //         text: [{ type: "text", text: { content: "Lacinato kale" } }],
  //       },
  //     },
  //   ],
  // });
};

const getTitlePropName = (db: GetDatabaseResponse): string => {
  const propNames = Object.keys(db.properties);
  for (const propName of propNames) {
    const srcProp = db.properties[propName];
    if (srcProp.type === "title") {
      return propName;
    }
  }
  throw new Error(`db with id ${db.id} seems not to have a title property`);
};

export default registerCommand;
