import type { Page } from "puppeteer";
import { logger } from "./logging";

export async function login(page: Page, email: string, password: string) {
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

export async function skipOnboarding(page: Page) {
  try {
    logger.info("cancelling mic/camera onboarding, if applicable");

    await getByRole(
      page,
      "button",
      "Continue without microphone and camera"
    )?.click();
  } catch (e) {}
}

export async function joinMeet(page: Page) {
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

export async function getMeetingName(page: Page) {
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
