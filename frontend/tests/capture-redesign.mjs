// Read-only local browser probe. Run after `npm run build` and `npm run start -- --port 3200`.
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const baseURL = process.argv[2] || "http://127.0.0.1:3200";
const output = fileURLToPath(
  new URL("../../docs/redesign/after/", import.meta.url),
);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chromium" });
const routes = [
  ["landing", "/"],
  ["auth", "/workspace"],
  ["overview", "/workspace?demo=1"],
  ...["timeline", "processes", "graph", "evidence", "findings", "reports"].map(
    (name) => [name, `/workspace/${name}?demo=1`],
  ),
];
const audit = [],
  errors = [],
  unexpectedResponses = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 1000 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        /hydration|didn't match|uncaught/i.test(message.text())
      )
        errors.push(message.text());
    });
    page.on("response", (response) => {
      if (
        response.status() >= 400 &&
        !(response.status() === 401 && response.url().endsWith("/auth/me"))
      )
        unexpectedResponses.push({
          url: response.url(),
          status: response.status(),
        });
    });
    for (const [name, route] of routes) {
      await page.goto(`${baseURL}${route}`);
      await page.getByRole("heading", { level: 1 }).waitFor();
      if (name === "landing")
        await page.locator(".spatial-hero .spatial-node").first().waitFor();
      if (["processes", "graph"].includes(name))
        await page.locator(".graph-entity").first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
      await page.screenshot({
        path: `${output}${name}${width === 390 ? "-mobile" : ""}.png`,
      });
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      audit.push({
        name,
        width,
        overflow: await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        violations: result.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
          description: v.help,
        })),
      });
      console.log(
        `${width}px ${name}: ${result.violations.length} accessibility violations`,
      );
    }
    await page.goto(baseURL);
    await page.locator(".spatial-hero .spatial-node").first().waitFor();
    for (let chapter = 1; chapter <= 6; chapter++) {
      const section = page.locator(`#chapter-${chapter}`);
      await section.scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      await section.screenshot({
        path: `${output}chapter-${chapter}${width === 390 ? "-mobile" : ""}.png`,
      });
    }
    await context.close();
  }
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "no-preference",
  });
  await context.addInitScript(() => {
    window.spectreMetrics = { lcp: 0, cls: 0 };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        window.spectreMetrics.lcp = entry.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        if (!entry.hadRecentInput) window.spectreMetrics.cls += entry.value;
    }).observe({ type: "layout-shift", buffered: true });
  });
  const page = await context.newPage();
  await page.goto(baseURL);
  const field = page.locator(".hero-environment canvas");
  await field.waitFor();
  await page.locator(".spatial-hero .spatial-node").first().waitFor();
  await page.waitForTimeout(1500);
  const frameStart = Number(await field.getAttribute("data-frames"));
  await page.waitForTimeout(1000);
  const desktopFrames =
    Number(await field.getAttribute("data-frames")) - frameStart;
  const metrics = await page.evaluate(() => ({
    ...window.spectreMetrics,
    domContentLoadedMs:
      performance.getEntriesByType("navigation")[0].domContentLoadedEventEnd,
    resourceTransferBytes: performance
      .getEntriesByType("resource")
      .reduce((total, entry) => total + entry.transferSize, 0),
  }));
  const interaction = await page.evaluate(async () => {
    const start = performance.now();
    document.querySelector(".spatial-hero .spatial-node").click();
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    return {
      twoFrameSelectionMs: performance.now() - start,
      selectedTitle: document.querySelector(".hero-selection h3")?.textContent,
    };
  });
  await page
    .getByRole("button", { name: "Pause ambient motion", exact: true })
    .click();
  const pausedStart = await field.getAttribute("data-frames");
  await page.waitForTimeout(500);
  const paused = (await field.getAttribute("data-frames")) === pausedStart;
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
  });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(baseURL);
  const mobileField = mobilePage.locator(".hero-environment canvas");
  await mobileField.waitFor();
  await mobilePage.waitForTimeout(300);
  const mobileStart = Number(await mobileField.getAttribute("data-frames"));
  await mobilePage.waitForTimeout(1000);
  const performance = {
    environment:
      "Local production Next.js; headless Chromium; unthrottled; one run, not field Core Web Vitals or INP",
    ...metrics,
    ...interaction,
    desktopCanvasFramesInOneSecond: desktopFrames,
    mobileCanvasFramesInOneSecond:
      Number(await mobileField.getAttribute("data-frames")) - mobileStart,
    mobileCanvasMode: await mobileField.getAttribute("data-motion"),
    pauseStoppedFrames: paused,
  };
  await writeFile(
    `${output}audit.json`,
    JSON.stringify({ audit, errors, unexpectedResponses }, null, 2),
  );
  await writeFile(
    `${output}performance.json`,
    JSON.stringify(performance, null, 2),
  );
  console.log(JSON.stringify(performance, null, 2));
  if (
    errors.length ||
    unexpectedResponses.length ||
    audit.some((result) => result.overflow || result.violations.length)
  )
    process.exitCode = 1;
} finally {
  await browser.close();
}
