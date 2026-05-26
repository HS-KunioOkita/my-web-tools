import "server-only";
import { chromium, type Browser } from "playwright";

let browserPromise: Promise<Browser> | null = null;
let disposed = false;

async function launchBrowser(): Promise<Browser> {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  browser.on("disconnected", () => {
    browserPromise = null;
  });
  return browser;
}

export async function getBrowser(): Promise<Browser> {
  if (disposed) {
    throw new Error("chromium singleton already disposed");
  }
  if (!browserPromise) {
    browserPromise = launchBrowser().catch((err) => {
      browserPromise = null;
      throw err;
    });
  }
  return browserPromise;
}

async function dispose() {
  disposed = true;
  if (!browserPromise) return;
  try {
    const browser = await browserPromise;
    await browser.close();
  } catch {
    // best-effort cleanup
  } finally {
    browserPromise = null;
  }
}

if (typeof process !== "undefined" && typeof process.once === "function") {
  process.once("exit", () => {
    void dispose();
  });
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      void dispose().finally(() => process.exit(0));
    });
  }
}
