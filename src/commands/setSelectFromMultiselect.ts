import { Client } from "@notionhq/client/build/src";
import { Command } from "commander";
import { getNotionClient } from "../notionClient";
import { QueryDatabaseFilter, SelectChoice } from "../types";
import { databaseQueryAll } from "../utils";
import { removeSelectOptions } from "./removeSelectOptions";

const registerCommand = (program: Command) => {
  program
    .command("set-select-from-multi-select")
    .description(
      "Set a select property based on which choice is set in a multi-select property."
    )
    .requiredOption(
      "--db-id <database-id>",
      "The ID of the notion database to modify."
    )
    .requiredOption(
      "--multi-select-property <multi-select-property>",
      "The name of the source multi-select property from which choices should be moved."
    )
    .requiredOption(
      "--select-property <select-property>",
      "The name of the target select property where the choices should be set."
    )
    .requiredOption("--options <options...>", "The options to be removed.")
    .action(
      async ({
        dbId,
        multiSelectProperty: multiSelectPropertyName,
        selectProperty: selectPropertyName,
        options: optionNamesToMove,
      }) => {
        await setSelectBasedOnMultiselectOptions({
          client: getNotionClient(program),
          dbId,
          multiSelectPropertyName,
          selectPropertyName,
          optionNamesToMove,
        });
      }
    );
};

type Args = {
  client: Client;
  dbId: string;
  multiSelectPropertyName: string;
  selectPropertyName: string;
  optionNamesToMove: string[];
};

/**
 * Set a single select property based on which
 * of a set of multi_select choices a page has.
 * Removes the same from the original page.
 */
export const setSelectBasedOnMultiselectOptions = async ({
  client,
  dbId,
  multiSelectPropertyName,
  optionNamesToMove,
  selectPropertyName,
}: Args) => {
  const db = await client.databases.retrieve({ database_id: dbId });
  const prop = db.properties[multiSelectPropertyName];
  if (prop.type !== "multi_select") {
    throw new Error(
      `${multiSelectPropertyName} is not a multi_select property`
    );
  }
  const multiSelectOptionNames = prop.multi_select.options.map((o) => o.name);
  const missingOptionNames = optionNamesToMove.filter(
    (name) => !multiSelectOptionNames.includes(name)
  );
  if (missingOptionNames.length) {
    throw new Error(
      `(${missingOptionNames.join(
        ", "
      )}) are missing from the ${multiSelectPropertyName} property`
    );
  }
  const sourceOptionsMap: Record<string, SelectChoice> = {};
  prop.multi_select.options.forEach((o) => {
    sourceOptionsMap[o.name] = o;
  });

  // Check that the options exist on the target single select
  const selectProp = db.properties[selectPropertyName];
  if (selectProp.type !== "select") {
    throw new Error(`${selectPropertyName} is not a select property`);
  }
  const targetOptionsMap: Record<string, SelectChoice> = {};
  selectProp.select.options.forEach((o) => {
    if (optionNamesToMove.includes(o.name)) {
      targetOptionsMap[o.name] = o;
    }
  });
  const missingSingleSelectOptionNames = optionNamesToMove.filter(
    (name) => !Object.keys(targetOptionsMap).includes(name)
  );
  if (missingSingleSelectOptionNames.length) {
    const newOptions = [
      ...selectProp.select.options,
      ...missingSingleSelectOptionNames.map((name) => ({
        name,
        color: sourceOptionsMap[name].color,
      })),
    ];
    const updateRes = await client.databases.update({
      database_id: dbId,
      properties: {
        [selectPropertyName]: {
          select: {
            options: newOptions,
          },
        },
      },
    });
    const updatedTgtSelect = updateRes.properties[selectPropertyName];
    if (updatedTgtSelect.type !== "select") {
      throw new Error(
        `${selectPropertyName} is for some reason no longer a "select" property`
      );
    }
    missingSingleSelectOptionNames.forEach((missingName) => {
      const option = updatedTgtSelect.select.options.find(
        (o) => o.name === missingName
      );
      if (!option) {
        throw new Error(
          `${selectPropertyName} is missing the ${missingName} option`
        );
      }
      targetOptionsMap[missingName] = option;
    });
  }

  for (let i = 0; i < optionNamesToMove.length; i++) {
    const optionName = optionNamesToMove[i];
    const targetOption = targetOptionsMap[optionName];
    const filter: QueryDatabaseFilter = {
      property: multiSelectPropertyName,
      multi_select: {
        contains: optionName,
      },
    };

    const pages = await databaseQueryAll({ client, dbId, filter });
    for (let j = 0; j < pages.length; j++) {
      const page = pages[j];
      const multiProp = page.properties[multiSelectPropertyName];
      if (multiProp.type !== "multi_select") {
        throw new Error(
          `page ${page.id} has a ${multiSelectPropertyName} that is not a "multi_select"`
        );
      }

      // If the page has multiple values of the set that we are mapping into the single
      // value, the behavior is undefined, so blow up.
      const matchingOptions = multiProp.multi_select
        .map((o) => o.name)
        .filter((name) => optionNamesToMove.includes(name));
      if (matchingOptions.length > 1) {
        throw new Error(
          `page ${
            page.id
          } has multiple values for the target single select: ${matchingOptions.join(
            ", "
          )}`
        );
      }

      await client.pages.update({
        page_id: page.id,
        properties: {
          [multiSelectPropertyName]: {
            multi_select: multiProp.multi_select.filter(
              (o) => !optionNamesToMove.includes(o.name)
            ),
          },
          [selectPropertyName]: {
            select: {
              id: targetOption.id!,
              name: targetOption.name!,
              color: targetOption.color!,
            },
          },
        },
      });
    }
  }

  await removeSelectOptions({
    client,
    dbId,
    propertyName: multiSelectPropertyName,
    optionsToRemove: optionNamesToMove,
  });
};

export default registerCommand;
