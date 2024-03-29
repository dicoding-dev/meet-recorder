import { WriteStream, createWriteStream } from "fs";
import path from "path";
import puppeteer from "puppeteer";
import { launch, getStream } from "puppeteer-stream/src/PuppeteerStream";
import { logger } from "./logging";
import { generateVideoFilename } from "./utils";
import { Transform } from "stream";
import { login, skipOnboarding, joinMeet } from "./automation";

const AUTO_FINISH_TIMEOUT_IN_MINUTES = 120;

export async function recordMeeting(
  meetUrl: string,
  outputDirectory: string,
  googleAccount: string,
  googlePassword: string
) {
  const { page, browser } = await createBrowserPage();

  logger.info("Opening meet page: " + meetUrl);
  await page.goto(meetUrl);

  // @ts-ignore
  await login(page, googleAccount, googlePassword);
  // @ts-ignore
  await skipOnboarding(page);
  // @ts-ignore
  await joinMeet(page);

  // @ts-ignore
  await page
    .locator(`::-p-aria([role="button"][name="Show everyone"])`)
    .click();
  // // @ts-ignore
  await page
    .locator(`::-p-aria([role="button"][name="Show everyone"])`)
    .click();

  const file = createWriteStream(
    path.join(
      outputDirectory,
      generateVideoFilename(new URL(meetUrl).pathname.slice(1))
    )
  );
  const stream = await getStream(page, { audio: true, video: true });

  logger.info("Starting screen record");
  stream.pipe(file);

  page
    .exposeFunction("FINISH_RECORDING", () => {
      logger.info("Client request finish recording, stopping screen record");
      setTimeout(async () => {
        await cleanup(stream, file);
      }, 2000);
    })
    .then(() =>
      page.exposeFunction("SET_PARTICIPANTS_COUNT", (participantsCount) => {
        logger.info("Current participants: " + participantsCount);
      })
    )
    .then(() => page.waitForSelector('button[aria-label="Leave call"]'))
    .then(() =>
      page.evaluate(() => {
        document
          .querySelector('button[aria-label="Leave call"]')
          ?.addEventListener(
            "click",
            // @ts-expect-error
            async () => await window.FINISH_RECORDING()
          );
      })
    )
    .then(() =>
      page.evaluate(() => {
        setInterval(async () => {
          const participantsCount = (
            document.querySelector(
              '[role="button"] h2 div:last-child'
            ) as HTMLElement
          )?.innerText;

          // @ts-expect-error
          await window.SET_PARTICIPANTS_COUNT(parseInt(participantsCount));
        }, 4000);
      })
    );

  browser.on("disconnected", async () => {
    logger.info("Browser disconnected, stopping screen record");
    await cleanup(stream, file);
  });

  setTimeout(async () => {
    logger.info(
      `Reaching maximum set timeout at ${AUTO_FINISH_TIMEOUT_IN_MINUTES} minutes, stopping screen record`
    );
    await cleanup(stream, file);
  }, AUTO_FINISH_TIMEOUT_IN_MINUTES * 60 * 1000);
}

async function createBrowserPage() {
  logger.info("Starting browser");

  const browser = await launch({
    executablePath: puppeteer.executablePath(),
    headless: false,
    defaultViewport: null,
    args: [
      "--window-size=1920,1080",
      "--disable-blink-features=AutomationControlled",
      "--disable-features=DialMediaRouteProvider",
      "--disable-infobars",
    ],
  });
  const context = browser.defaultBrowserContext();
  const [page] = await browser.pages();

  await context.overridePermissions("https://meet.google.com", []);

  return { page, browser };
}

async function cleanup(stream: Transform, file: WriteStream) {
  logger.info("Closing video stream");
  await stream.destroy();
  logger.info("Closing file stream");
  file.close();
  logger.info("Exiting process");
  process.exit();
}
