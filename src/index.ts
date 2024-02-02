import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { recordMeeting } from "./recorder";

const args = yargs(hideBin(process.argv))
  .option("url", {
    alias: "u",
    describe: "The meeting URL",
    demandOption: true,
  })
  .check((argv) => {
    if (!argv.url.startsWith("https://meet.google.com")) {
      throw new Error("Invalid Google Meet URL");
    }

    return true;
  })
  .parse();

(async () => {
  await recordMeeting(args.url);
})();
