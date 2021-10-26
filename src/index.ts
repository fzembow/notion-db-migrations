import { Command } from "commander";
import archiveAllPagesInDb from "./commands/archiveAllPagesInDatabase";
import copyBetweenDbs from "./commands/copyBetweenDbs";
import mergeSelectOptions from "./commands/mergeSelectOptions";
import removeSelectOptions from "./commands/removeSelectOptions";
import removeUnusedSelectOptions from "./commands/removeUnusedSelectOptions";
import setMultiSelectBasedOnMultiselectOptions from "./commands/setMultiselectFromMultiselect";
import setSelectFromMultiselect from "./commands/setSelectFromMultiselect";

const program = new Command();
program.requiredOption("-t, --token <token>", "notion api token");

// Register all the sub-commands.
archiveAllPagesInDb(program);
copyBetweenDbs(program);
mergeSelectOptions(program);
removeSelectOptions(program);
removeUnusedSelectOptions(program);
setMultiSelectBasedOnMultiselectOptions(program);
setSelectFromMultiselect(program);

// TODO
// createPagesForMultiselect.ts

async function main() {
  await program.parseAsync(process.argv);
}

main();
