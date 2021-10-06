import { Command } from "commander";
import archiveAllPagesInDb from "./commands/archiveAllPagesInDatabase";
import removeSelectOptions from "./commands/removeSelectOptions";

const program = new Command();
program.requiredOption("-t, --token <token>", "notion api token");

archiveAllPagesInDb(program);
removeSelectOptions(program);

// TODO
// createPagesForMultiselect.ts
// mergeMultiselectValues.ts
// removeUnusedMultiselectOptions.ts
// setSelectBasedOnMultiselectOptions.ts

async function main() {
  await program.parseAsync(process.argv);
}

main();
