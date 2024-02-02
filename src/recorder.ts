import "dotenv/config";
import { WriteStream, createWriteStream } from "fs";
import puppeteer, { Page } from "puppeteer";
import { launch, getStream } from "puppeteer-stream";
import { logger } from "./logging";
import { generateVideoFilename } from "./utils";
import { Transform } from "stream";

const googleAccount = process.env.GOOGLE_EMAIL as string;
const googlePassword = process.env.GOOGLE_PASSWORD as string;

export async function recordMeeting(meetUrl: string) {
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
  const page = await context.newPage();

  await context.overridePermissions("https://meet.google.com", []);

  logger.info("Opening meet page: " + meetUrl);
  await page.goto(meetUrl);

  // @ts-ignore
  await login(page, googleAccount, googlePassword);
  // @ts-ignore
  await skipOnboarding(page);
  // @ts-ignore
  await joinMeet(page);

  const file = createWriteStream(
    __dirname +
      `/../videos/${generateVideoFilename(new URL(meetUrl).pathname.slice(1))}`
  );
  const stream = await getStream(page, { audio: true, video: true });

  logger.info("Starting screen record");
  stream.pipe(file);

  // @todo: close browser when exited the meeting
  browser.on("disconnected", async () => {
    logger.info("Browser disconnected, stopping screen record");
    await cleanup(stream, file);
  });
}

async function cleanup(stream: Transform, file: WriteStream) {
  await stream.destroy();
  file.close();

  logger.info("Finished, cleaning up");

  process.exit();
}

async function login(page: Page, email: string, password: string) {
  const signInLink = await getByRole(page, "button", "Sign in");

  if (!signInLink) {
    return;
  }

  logger.info(`Logging in as: ${email}`);

  await signInLink.click();
  await getByRole(page, "textbox", "Email or phone").fill(email);
  await getByRole(page, "button", "Next").click();
  await getByRole(page, "textbox", "Enter your password").fill(password);
  await getByRole(page, "button", "Next").click();
}

async function skipOnboarding(page: Page) {
  try {
    logger.info("cancelling mic/camera onboarding, if applicable");

    await getByRole(
      page,
      "button",
      "Continue without microphone and camera"
    )?.click();
  } catch (e) {}
}

async function joinMeet(page: Page) {
  try {
    logger.info("Try joining meet");
    await getByRole(page, "button", "Join now")?.click();
    return;
  } catch (e) {}

  try {
    logger.info("Can't join automatically, ask to join");
    await getByRole(page, "button", "Ask to join")?.click();
  } catch (e) {}
}

async function getMeetingName(page: Page) {
  try {
    await page.waitForSelector("[data-meeting-title]");
    return (
      (await page.$eval("[data-meeting-title]", (el) => el.textContent)) ?? ""
    );
  } catch (e) {}
}

function getByRole(
  page: Page,
  role: string,
  label: string,
  timeout: number = 5000
) {
  return page
    .locator(`::-p-aria([role="${role}"][name="${label}"])`)
    .setTimeout(timeout);
}
