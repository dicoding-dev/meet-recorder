import "dotenv/config";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { recordMeeting } from "./recorder";
import fs from "fs";
import path from "path";

const argv = yargs(hideBin(process.argv))
  .option("url", {
    alias: "u",
    describe: "The meeting URL",
    demandOption: true,
  })
  .option("outDir", {
    alias: "o",
    default: "../videos",
    describe:
      "The path to directory that will be used to store the recorded video",
  })
  .middleware(function (argv) {
    argv.outDir = argv.o = path.resolve(__dirname, argv.outDir);
  }, true)
  .check((argv) => {
    if (!argv.url.startsWith("https://meet.google.com")) {
      throw new Error("Invalid Google Meet URL");
    }

    if (!fs.existsSync(argv.outDir)) {
      throw new Error("The output directory path doesn't exist");
    }

    return true;
  })
  .parse();

(async () => {
  const googleAccount = process.env.GOOGLE_EMAIL as string;
  const googlePassword = process.env.GOOGLE_PASSWORD as string;

  await recordMeeting(argv.url, argv.outDir, googleAccount, googlePassword);
})();
