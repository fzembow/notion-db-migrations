import { Client } from "@notionhq/client";
import { Command } from "commander";

export const getNotionClient = (program: Command) => {
  const token = program.opts().token;
  return new Client({
    auth: token,
  });
};
