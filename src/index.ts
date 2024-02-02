import "dotenv/config";
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
  const googleAccount = process.env.GOOGLE_EMAIL as string;
  const googlePassword = process.env.GOOGLE_PASSWORD as string;

  await recordMeeting(args.url, googleAccount, googlePassword);
})();
