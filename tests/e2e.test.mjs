import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { chromium } from "@playwright/test";

test("quote card renders and reacts in a browser", { timeout: 45000 }, async () => {
  const server = spawn(process.execPath, ["scripts/serve.mjs", "--root", ".", "--port", "4185"], {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"]
  });

  let browser;
  try {
    await waitForServer("http://127.0.0.1:4185", server);

    browser = await chromium.launch({ timeout: 15000 });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    await page.goto("http://127.0.0.1:4185", { waitUntil: "networkidle" });

    await assertVisibleText(page, "OPC 报价卡");
    await assertVisibleText(page, "17,078 元");

    await page.getByRole("radio", { name: "XL" }).first().check();
    await assertVisibleText(page, "50,094 元");

    await page.getByRole("button", { name: "买家对比" }).click();
    await assertVisibleText(page, "买家对比表");
    await assertVisibleText(page, "OPC-A");

    await page.setViewportSize({ width: 390, height: 900 });
    await page.getByRole("button", { name: "报价填报" }).click();
    await assertVisibleText(page, "最终报价");
    assert.equal(await hasPageOverflow(page), false);
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
});

async function assertVisibleText(page, text) {
  const locator = page.getByText(text, { exact: false }).first();
  await locator.waitFor({ state: "visible", timeout: 5000 });
  assert.ok(await locator.isVisible());
}

async function hasPageOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
}

async function waitForServer(url, server) {
  let stderr = "";
  server.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });

  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Server exited before startup. ${stderr}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await delay(120);
    }
  }
  throw new Error(`Server did not start within 10s. ${stderr}`);
}
