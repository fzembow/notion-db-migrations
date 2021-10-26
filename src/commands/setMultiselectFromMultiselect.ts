import { Client } from "@notionhq/client/build/src";
import { Command } from "commander";
import { getNotionClient } from "../notionClient";
import { QueryDatabaseFilter, SelectChoice } from "../types";
import { databaseQueryAll } from "../utils/notion";
import { removeSelectOptions } from "./removeSelectOptions";

const registerCommand = (program: Command) => {
  program
    .command("set-multi-select-from-multi-select")
    .description(
      "Set a multi_select property based on which choices are set in another multi-select property."
    )
    .requiredOption(
      "--db-id <database-id>",
      "The ID of the notion database to modify."
    )
    .requiredOption(
      "--source-property <source-property>",
      "The name of the source multi-select property from which choices should be moved."
    )
    .requiredOption(
      "--destination-property <destination-property>",
      "The name of the target multi_select property where the choices should be set."
    )
    .requiredOption("--options <options...>", "The options to be moved.")
    .action(
      async ({
        dbId,
        sourceProperty: sourcePropertyName,
        destinationProperty: destinationPropertyName,
        options: optionNamesToMove,
      }) => {
        await setMultiSelectBasedOnMultiselectOptions({
          client: getNotionClient(program),
          dbId,
          sourcePropertyName,
          destinationPropertyName,
          optionNamesToMove,
        });
      }
    );
};

type Args = {
  client: Client;
  dbId: string;
  sourcePropertyName: string;
  destinationPropertyName: string;
  optionNamesToMove: string[];
};

/**
 * Set a single select property based on which
 * of a set of multi_select choices a page has.
 * Removes the same from the original page.
 */
export const setMultiSelectBasedOnMultiselectOptions = async ({
  client,
  dbId,
  sourcePropertyName,
  destinationPropertyName,
  optionNamesToMove,
}: Args) => {
  const db = await client.databases.retrieve({ database_id: dbId });
  const sourceProp = db.properties[sourcePropertyName];
  if (sourceProp.type !== "multi_select") {
    throw new Error(
      `source "${sourcePropertyName}" is not a multi_select property`
    );
  }
  const multiSelectOptionNames = sourceProp.multi_select.options.map(
    (o) => o.name
  );
  const missingOptionNames = optionNamesToMove.filter(
    (name) => !multiSelectOptionNames.includes(name)
  );
  if (missingOptionNames.length) {
    throw new Error(
      `(${missingOptionNames.join(
        ", "
      )}) are missing from the ${sourcePropertyName} property`
    );
  }
  const sourceOptionsMap: Record<string, SelectChoice> = {};
  sourceProp.multi_select.options.forEach((o) => {
    sourceOptionsMap[o.name] = o;
  });

  // Check that the options exist on the target multi_select select
  const destinationProp = db.properties[destinationPropertyName];
  if (destinationProp.type !== "multi_select") {
    throw new Error(
      `destination "${destinationPropertyName}" is not a multi_select property`
    );
  }
  const targetOptionsMap: Record<string, SelectChoice> = {};
  destinationProp.multi_select.options.forEach((o) => {
    if (optionNamesToMove.includes(o.name)) {
      targetOptionsMap[o.name] = o;
    }
  });
  const missingDestinationOptionNames = optionNamesToMove.filter(
    (name) => !Object.keys(targetOptionsMap).includes(name)
  );
  if (missingDestinationOptionNames.length) {
    const newOptions = [
      ...destinationProp.multi_select.options,
      ...missingDestinationOptionNames.map((name) => ({
        name,
        color: sourceOptionsMap[name].color,
      })),
    ];
    const updateRes = await client.databases.update({
      database_id: dbId,
      properties: {
        [destinationPropertyName]: {
          multi_select: {
            options: newOptions,
          },
        },
      },
    });
    const updatedTgtSelect = updateRes.properties[destinationPropertyName];
    if (updatedTgtSelect.type !== "multi_select") {
      throw new Error(
        `destination "${destinationPropertyName}" is for some reason no longer a "multi_select" property`
      );
    }
    missingDestinationOptionNames.forEach((missingName) => {
      const option = updatedTgtSelect.multi_select.options.find(
        (o) => o.name === missingName
      );
      if (!option) {
        throw new Error(
          `${destinationPropertyName} is missing the ${missingName} option`
        );
      }
      targetOptionsMap[missingName] = option;
    });
  }

  for (const optionName of optionNamesToMove) {
    const targetOption = targetOptionsMap[optionName];
    const filter: QueryDatabaseFilter = {
      property: sourcePropertyName,
      multi_select: {
        contains: optionName,
      },
    };

    const pages = await databaseQueryAll({ client, dbId, filter });
    for (const page of pages) {
      const multiProp = page.properties[sourcePropertyName];
      if (multiProp.type !== "multi_select") {
        throw new Error(
          `page ${page.id} has a ${sourcePropertyName} that is not a "multi_select"`
        );
      }

      const tgtProp = page.properties[destinationPropertyName];
      if (tgtProp.type !== "multi_select") {
        throw new Error(
          `page ${page.id} has a ${destinationPropertyName} that is not a "multi_select"`
        );
      }

      await client.pages.update({
        page_id: page.id,
        properties: {
          [sourcePropertyName]: {
            multi_select: multiProp.multi_select.filter(
              (o) => o.name !== optionName
            ),
          },
          [destinationPropertyName]: {
            multi_select: [
              ...tgtProp.multi_select,
              {
                id: targetOption.id!,
                name: targetOption.name!,
                color: targetOption.color!,
              },
            ],
          },
        },
      });
    }
  }

  // await removeSelectOptions({
  //   client,
  //   dbId,
  //   propertyName: sourcePropertyName,
  //   optionsToRemove: optionNamesToMove,
  // });
};

export default registerCommand;
