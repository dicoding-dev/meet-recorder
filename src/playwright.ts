import "dotenv/config";
import { Page, chromium } from "playwright";

const meetUrl = "https://meet.google.com/iks-eack-bbb";
const googleAccount = process.env.GOOGLE_EMAIL as string;
const googlePassword = process.env.GOOGLE_PASSWORD as string;

(async () => {
  const browser = await chromium.launchPersistentContext(
    "./playwright-user-data",
    {
      headless: false,
      recordVideo: { dir: "videos/" },
      args: [
        "--disable-blink-features=AutomationControlled",
        // "--disable-notifications",
        // "--disable-gpu",
        // "--disable-setuid-sandbox",
        // "--deterministic-fetch",
        // "--disable-features=IsolateOrigins,site-per-process",
        // "--disable-site-isolation-trials",
        // "--disable-web-security",
      ],
    }
  );

  const page = await browser.newPage();

  await page.goto(meetUrl);
  await login(page, googleAccount, googlePassword);
  await skipOnboarding(page);

  const askToJoinButton = page.getByRole("button", {
    name: /join now/i,
  });

  await askToJoinButton.waitFor();

  if (await askToJoinButton.isVisible()) {
    await askToJoinButton.click();
  }
})();

async function login(page: Page, email: string, password: string) {
  const signInLink = page.getByRole("button", { name: "Sign In" });

  if ((await signInLink.count()) < 1) {
    return;
  }

  await signInLink.first().click();
  await page.getByRole("textbox", { name: "Email or phone" }).fill(email);
  await page.getByRole("button", { name: "Next" }).click();
  await page
    .getByRole("textbox", { name: "Enter your password" })
    .fill(password);
  await page.getByRole("button", { name: "Next" }).last().click();
}

async function skipOnboarding(page: Page) {
  const cancelMicCameraPermissionButton = page.getByRole("button", {
    name: "Continue without microphone and camera",
  });

  if ((await cancelMicCameraPermissionButton.count()) > 0) {
    console.log("cancelling mic/camera onboarding");
    await cancelMicCameraPermissionButton.click();
  }
}
