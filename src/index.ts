import { Command } from "commander";
import archiveAllPagesInDb from "./commands/archiveAllPagesInDatabase";

const program = new Command();
program.requiredOption("-t, --token <token>", "notion api token");

archiveAllPagesInDb(program);
// TODO
// removeMultiselectOptions.ts
// createPagesForMultiselect.ts
// mergeMultiselectValues.ts
// removeUnusedMultiselectOptions.ts
// setSelectBasedOnMultiselectOptions.ts

async function main() {
  await program.parseAsync(process.argv);
}

main();
