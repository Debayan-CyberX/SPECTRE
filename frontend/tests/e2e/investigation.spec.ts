import { test, expect } from "@playwright/test";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";

test("public narrative selects parsed evidence and never opens private APIs", async ({
  page,
}) => {
  const privateCalls: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/cases"))
      privateCalls.push(request.url());
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Reconstruct the unseen." }),
  ).toBeVisible();
  await page
    .locator(".reconstruction-hero")
    .getByRole("button", { name: "Inspect WINWORD.EXE started", exact: true })
    .click();
  await expect(page.locator(".hero-selection h3")).toHaveText(
    "WINWORD.EXE started",
  );
  await expect(page.locator(".mini-inspector h3")).toHaveText(
    "WINWORD.EXE started",
  );
  const preview = page.locator(".living-workspace-preview");
  await preview.getByRole("button", { name: "Timeline", exact: true }).click();
  await expect(preview.locator(".forensic-timeline")).toBeVisible();
  await preview
    .getByRole("button", { name: "Relationships", exact: true })
    .click();
  await expect(preview.locator(".spatial-node")).toHaveCount(11);
  await preview.getByRole("button", { name: "Processes", exact: true }).click();
  await expect(preview.locator(".process-story-step")).toHaveCount(4);
  const evidence = page.locator("#chapter-5");
  await evidence.getByRole("button", { name: "Raw data", exact: true }).click();
  await expect(evidence.locator("pre")).toContainText("WINWORD.EXE started");
  await page
    .locator(".reconstruction-hero")
    .getByRole("link", { name: "Explore sample case", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Operation Glasshouse", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Timeline", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Timeline Explorer/ }),
  ).toBeVisible();
  await page.getByLabel("Filter by event source").selectOption("network");
  await expect(
    page.getByRole("button", {
      name: "Connection to 203.0.113.42",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Connection to 203.0.113.42", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Event inspector" }),
  ).toBeVisible();
  expect(privateCalls).toEqual([]);
});

test("analyst creates a case, imports evidence, reviews a lead and exports a stored report", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/workspace");
  await page.getByLabel("Username", { exact: true }).fill("analyst");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Spectre-E2E-only-passphrase");
  await page.getByRole("button", { name: "Enter workspace" }).click();
  await page
    .getByRole("button", { name: "Create investigation", exact: true })
    .click();
  await page.getByLabel("Investigation name").fill("Browser verification case");
  await page
    .getByLabel("Investigation context")
    .fill("Synthetic evidence, actual ingestion.");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create investigation" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Browser verification case",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Import evidence", exact: true })
    .click();
  await page
    .getByLabel("Choose evidence file")
    .setInputFiles(path.resolve("../datasets/synthetic/glasshouse.jsonl"));
  await page.getByLabel("Acquisition source").fill("Automated browser test");
  await page.getByRole("button", { name: "Import & process" }).click();
  await expect(page.getByRole("status")).toContainText("14 normalized events");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("link", { name: "Timeline", exact: true }).click();
  await page
    .getByRole("button", { name: "powershell.exe started", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "notes", exact: true }).click();
  await page
    .getByLabel("Analyst note", { exact: true })
    .fill(
      "Encoded command observed. Investigate legitimate administrative use.",
    );
  await page.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(
    page.getByText(
      "Encoded command observed. Investigate legitimate administrative use.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close event inspector" }).click();
  await page.getByRole("link", { name: /^Findings/ }).click();
  await page.getByRole("button", { name: /SP-001/ }).click();
  await page
    .getByLabel("Analyst notes", { exact: true })
    .fill("Rule match verified; intent remains unconfirmed.");
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Review saved");
  await page
    .getByRole("link", { name: "Process Explorer", exact: true })
    .click();
  await expect(page.locator(".graph-entity")).toHaveCount(6);
  await page.getByRole("link", { name: "Reports", exact: true }).click();
  await page
    .getByRole("button", { name: "Create report", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "JSON", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".forensic-dossier")).toContainText(
    "Encoded command observed",
  );
  await expect(page.locator(".forensic-dossier")).toContainText(
    "Rule match verified; intent remains unconfirmed.",
  );
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "JSON", exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/spectre-.*\.json/);
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const report = JSON.parse(Buffer.concat(chunks).toString());
  expect(report.snapshot.events).toHaveLength(14);
  expect(report.snapshot.annotations[0].text).toContain(
    "Encoded command observed",
  );
  expect(
    report.snapshot.findings.find(
      (f: { rule_id: string }) => f.rule_id === "SP-001",
    ).status,
  ).toBe("confirmed");
  expect(errors).toEqual([]);
});

test("mobile navigation and command palette stay keyboard accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/workspace?demo=1");
  await expect(
    page.getByRole("heading", { name: "Operation Glasshouse", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const mobileAccessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(mobileAccessibility.violations).toEqual([]);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Evidence Vault", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Evidence Vault/ }),
  ).toBeVisible();
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog", { name: "Go anywhere" })).toBeVisible();
  await page.getByLabel("Search workspace commands").fill("Timeline");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Timeline", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: /Timeline Explorer/ }),
  ).toBeVisible();
});

test("landing and core investigation views pass automated accessibility checks", async ({
  page,
}) => {
  for (const route of [
    "/",
    "/workspace?demo=1",
    "/workspace/timeline?demo=1",
    "/workspace/processes?demo=1",
    "/workspace/graph?demo=1",
    "/workspace/evidence?demo=1",
    "/workspace/findings?demo=1",
    "/workspace/reports?demo=1",
    "/workspace",
  ]) {
    await page.goto(route);
    if (route === "/") {
      await expect(
        page.getByRole("heading", { name: "Reconstruct the unseen." }),
      ).toBeVisible();
      await expect(page.locator(".spatial-hero .spatial-node")).toHaveCount(8);
      await expect(page.locator(".narrative-chapter")).toHaveCount(6);
    } else {
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      if (route.includes("processes"))
        await expect(page.locator(".graph-entity")).toHaveCount(6);
    }
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations, route).toEqual([]);
  }
});

test("ambient geometry pauses, sleeps outside the viewport and settles for repeat visits", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /hydration|didn't match/i.test(message.text())
    )
      errors.push(message.text());
  });
  await page.goto("/");
  const field = page.locator(".hero-environment canvas");
  const silverBeam = page.locator(".silver-beam-one");
  await expect(field).toHaveAttribute("data-motion", "ambient");
  const first = Number(await field.getAttribute("data-frames"));
  await expect
    .poll(async () => Number(await field.getAttribute("data-frames")))
    .toBeGreaterThan(first + 2);
  await page
    .getByRole("button", { name: "Pause ambient motion", exact: true })
    .click();
  await expect(field).toHaveAttribute("data-motion", "static");
  const paused = await field.getAttribute("data-frames");
  const silverPaused = await silverBeam.evaluate(
    (element) => getComputedStyle(element).transform,
  );
  await page.waitForTimeout(250);
  expect(await field.getAttribute("data-frames")).toBe(paused);
  expect(
    await silverBeam.evaluate((element) => getComputedStyle(element).transform),
  ).toBe(silverPaused);
  await page
    .getByRole("button", { name: "Resume ambient motion", exact: true })
    .click();
  await page.locator("#chapter-3").scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const hidden = await field.getAttribute("data-frames");
  await page.waitForTimeout(250);
  expect(await field.getAttribute("data-frames")).toBe(hidden);
  await page.reload();
  await expect(page.locator(".reconstruction-hero")).toHaveAttribute(
    "data-returning",
    "true",
  );
  expect(errors).toEqual([]);
});

test("dashboard glass depth and silver light pause and respect reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/workspace?demo=1");
  await expect(page.locator(".intelligence-metrics")).toBeVisible();
  const metric = page.locator(".glass-metric").first();
  const resting = await metric.evaluate(
    (element) => getComputedStyle(element).transform,
  );
  const bounds = (await metric.boundingBox())!;
  await page.mouse.move(
    bounds.x + bounds.width * 0.8,
    bounds.y + bounds.height * 0.25,
  );
  await expect
    .poll(() =>
      metric.evaluate((element) => getComputedStyle(element).transform),
    )
    .not.toBe(resting);
  const beam = page.locator(".workspace-atmosphere .silver-beam-one");
  const transform = () =>
    beam.evaluate((element) => getComputedStyle(element).transform);
  const initial = await transform();
  await expect.poll(transform).not.toBe(initial);
  await page
    .getByRole("button", { name: "Pause ambient motion", exact: true })
    .click();
  await expect(metric).toHaveCSS("transform", "none");
  const paused = await transform();
  await page.waitForTimeout(200);
  expect(await transform()).toBe(paused);
  await page.getByRole("link", { name: "Timeline", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Resume ambient motion", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Resume ambient motion", exact: true })
    .click();
  await expect.poll(transform).not.toBe(paused);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(beam).toHaveCSS("animation-name", "none");
  await page
    .getByRole("button", { name: "WINWORD.EXE started", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Event inspector" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(metric).toHaveCSS("transform", "none");
});

test("evidence controls and static geometry remain usable when WebGL is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      value: function (
        this: HTMLCanvasElement,
        type: string,
        ...options: unknown[]
      ) {
        if (type.includes("webgl")) return null;
        return Reflect.apply(original, this, [type, ...options]);
      },
    });
  });
  await page.goto("/");
  await expect(
    page.locator(".hero-environment .forensic-field"),
  ).toHaveAttribute("data-motion", "static");
  await page
    .locator(".reconstruction-hero")
    .getByRole("button", { name: "Inspect WINWORD.EXE started", exact: true })
    .click();
  await expect(page.locator(".hero-selection h3")).toHaveText(
    "WINWORD.EXE started",
  );
});

test("timeline brush and drag change the real data window and reset restores the case", async ({
  page,
}) => {
  await page.goto("/workspace/timeline?demo=1");
  const start = page.getByLabel("Time window start", { exact: true });
  await expect(start).toBeVisible();
  const fullStart = Number(await start.inputValue());
  const brush = page.locator(".brush-track");
  await brush.scrollIntoViewIfNeeded();
  const box = (await brush.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.22, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await start.inputValue()))
    .toBeGreaterThan(fullStart);
  const brushed = Number(await start.inputValue());
  await page.locator(".timeline-plot").scrollIntoViewIfNeeded();
  const plot = (await page.locator(".timeline-plot").boundingBox())!;
  await page.mouse.move(plot.x + plot.width * 0.7, plot.y + 25);
  await page.mouse.down();
  await page.mouse.move(plot.x + plot.width * 0.55, plot.y + 25, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await start.inputValue()))
    .toBeGreaterThan(brushed);
  await page
    .getByRole("button", { name: "Reset time range", exact: true })
    .click();
  await expect
    .poll(async () => Number(await start.inputValue()))
    .toBe(fullStart);
  await expect(page.locator(".timeline-toolbar")).toContainText(
    "14 loaded events",
  );
  const firstEvent = page.locator(".timeline-event").first();
  await firstEvent.focus();
  await firstEvent.press("Enter");
  const inspector = page.getByRole("complementary", {
    name: "Event inspector",
  });
  await expect(inspector).toBeVisible();
  const before = await inspector.locator("h2").textContent();
  await firstEvent.press("ArrowRight");
  await expect(inspector.locator("h2")).not.toHaveText(before!);
});

test("process branches, entity inspection and keyboard split-pane resizing preserve navigation", async ({
  page,
}) => {
  await page.goto("/workspace/processes?demo=1");
  await expect(page.locator(".graph-entity")).toHaveCount(6);
  await page
    .getByRole("button", {
      name: "Collapse children of explorer.exe",
      exact: true,
    })
    .click();
  await expect(page.locator(".graph-entity")).toHaveCount(1);
  await page
    .getByRole("button", {
      name: "Expand children of explorer.exe",
      exact: true,
    })
    .click();
  await expect(page.locator(".graph-entity")).toHaveCount(6);
  const process = page
    .locator(".react-flow__node")
    .filter({ hasText: "WINWORD.EXE" });
  await process.focus();
  await process.press("Enter");
  await expect(
    page.getByRole("complementary", { name: "Event inspector" }),
  ).toBeVisible();
  const divider = page.getByRole("separator", {
    name: "Resize evidence inspector",
  });
  await divider.focus();
  await divider.press("ArrowLeft");
  await expect(divider).toHaveAttribute("aria-valuenow", "360");
  await page.getByRole("button", { name: "Focus branch", exact: true }).click();
  await expect(page.locator(".graph-entity")).toHaveCount(4);
  await page.getByRole("button", { name: "Show context", exact: true }).click();
  await expect(page.locator(".graph-entity")).toHaveCount(6);
  await page
    .getByRole("button", { name: "Close event inspector", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Collapse sidebar", exact: true })
    .click();
  await page.getByRole("link", { name: "Evidence Vault", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Evidence Vault/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Inspect custody & original", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("SHA-256");
});
