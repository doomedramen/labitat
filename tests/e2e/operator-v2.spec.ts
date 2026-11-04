import { test, expect, seedAndAuth } from "../fixtures";
const fixture = Array.from({ length: 3 }, (_, group) => ({
  name: ["Infrastructure", "Media", "Network"][group],
  items: Array.from({ length: 8 }, (_, index) => ({
    label: `Host ${group * 8 + index + 1}`,
    href: `https://host-${group}-${index}.test`,
    serviceType: "glances",
    cachedWidgetData: {
      _status: index === 6 ? "warn" : "ok",
      _statusText: index === 6 ? "CPU temperature high" : undefined,
      cpuPercent: index * 10,
      memPercent: 52,
      swapPercent: 0,
      load1: 1.21,
      uptime: "12 days",
    },
  })),
}));
test("24 services fit at 1440 × 900 in both themes; mobile and 200% zoom reflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedAndAuth(page, { groups: fixture });
  await page.goto("/");
  const cards = page.getByTestId("item-card");
  await expect(cards).toHaveCount(24);
  const rects = await cards.evaluateAll((elements) =>
    elements.map((element) => element.getBoundingClientRect().toJSON()),
  );
  expect(rects.every((rect) => rect.height === 96 && rect.bottom <= 900)).toBe(true);
  expect(new Set(rects.slice(0, 8).map((rect) => rect.x)).size).toBe(4);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
    true,
  );
  await page.screenshot({ path: "test-results/operator-24-dark.png", fullPage: true });
  await page.getByRole("button", { name: "Theme settings" }).click();
  await page.getByRole("menuitemradio", { name: "Light", exact: true }).click();
  await page.screenshot({ path: "test-results/operator-24-light.png", fullPage: true });
  for (const [width, columns, height] of [
    [1024, 3, 96],
    [640, 2, 96],
    [320, 1, 136],
  ]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(async () => Math.round((await cards.first().boundingBox())!.height))
      .toBe(height);
    const boxes = await cards.evaluateAll((elements) =>
      elements.slice(0, 8).map((element) => element.getBoundingClientRect().toJSON()),
    );
    expect(new Set(boxes.map((box) => box.x)).size).toBe(columns);
    expect(boxes.every((box) => Math.abs(box.height - height) < 1)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.getByRole("button", { name: "Inspect Host 1", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Host 1", exact: true });
  await expect(sheet).toBeVisible();
  const box = (await sheet.boundingBox())!;
  expect(box.x).toBe(0);
  expect(box.y).toBe(0);
  expect(box.width).toBe(320);
  await expect(sheet.getByRole("combobox", { name: "History range" })).toBeVisible();
  await expect(sheet.getByText("Loading history…", { exact: true })).toBeHidden();
  await page.screenshot({ path: "test-results/operator-mobile-details.png", fullPage: false });
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.setViewportSize({ width: 720, height: 450 }); // CSS viewport of a 1440 × 900 desktop at 200% browser zoom.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("search and filters preserve ordering and count services", async ({ page }) => {
  await seedAndAuth(page, { groups: fixture });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Needs attention 3", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Needs attention 3", exact: true }).click();
  await expect(page.getByTestId("item-card")).toHaveCount(3);
  await page.getByRole("button", { name: "All 24", exact: true }).click();
  await page.keyboard.press("/");
  await expect(page.getByRole("textbox", { name: "Find a service" })).toBeFocused();
  await page.keyboard.type("Media");
  await expect(page.getByTestId("item-card")).toHaveCount(8);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("textbox", { name: "Find a service" })).toBeFocused();
  await page.getByRole("textbox", { name: "Find a service" }).fill("Glances");
  await expect(page.getByTestId("item-card")).toHaveCount(24);
  await page.getByRole("textbox", { name: "Find a service" }).fill("");
  await expect(page.getByTestId("item-card").first()).toContainText("Host 1");
});
test("launch and inspect are independent, history loads only in the open 440px panel", async ({
  page,
}) => {
  let history = 0;
  page.on("response", (response) => {
    if (response.url().includes("/history?") && response.ok()) history++;
  });
  await seedAndAuth(page, { groups: fixture });
  await page.goto("/");
  expect(history).toBe(0);
  const card = page.getByTestId("item-card").first();
  await expect(card.getByRole("link")).toHaveAttribute("href", "https://host-0-0.test");
  expect(await card.locator("a button, button a").count()).toBe(0);
  const before = await card.boundingBox();
  await card.getByRole("button").focus();
  await page.keyboard.press("Enter");
  const panel = page.getByRole("dialog", { name: "Host 1", exact: true });
  await expect(panel).toBeVisible();
  expect((await panel.boundingBox())!.width).toBe(440);
  expect(await card.boundingBox()).toEqual(before);
  await expect.poll(() => history).toBe(1);
  await page.getByRole("combobox", { name: "History range" }).selectOption("24h");
  await expect.poll(() => history).toBe(2);
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(card.getByRole("button")).toBeFocused();
});
test("long names, large values, missing data, and empty groups stay usable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await seedAndAuth(page, {
    groups: [
      {
        name: "A very long group name that should be clipped without affecting navigation",
        items: [
          {
            label: "A".repeat(200),
            serviceType: "radarr",
            cachedWidgetData: { movies: 12500000, queued: 0 },
          },
          { label: "Missing", serviceType: "radarr" },
        ],
      },
      { name: "Empty" },
    ],
  });
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByText("12.5M", { exact: true })).toBeVisible();
  await expect(
    page.getByTestId("item-card").last().getByText("Data unavailable", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Empty", exact: true })).toBeVisible();
});
test("local date/time and search use working detail capabilities", async ({ page }) => {
  await seedAndAuth(page, {
    groups: [
      {
        name: "Utilities",
        items: [
          { label: "Clock", serviceType: "datetime" },
          {
            label: "Search",
            serviceType: "search",
            cachedWidgetData: { _status: "ok", engines: "Google,DuckDuckGo,Bing" },
          },
        ],
      },
    ],
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Inspect Clock", exact: true }).click();
  await expect(page.getByRole("dialog").locator("time")).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Inspect Search", exact: true }).click();
  await page.getByRole("textbox", { name: "Search query", exact: true }).fill("home lab");
  await page
    .getByRole("combobox", { name: "Search engine", exact: true })
    .selectOption("DuckDuckGo");
  await page
    .context()
    .route("https://duckduckgo.com/**", (route) =>
      route.fulfill({ contentType: "text/html", body: "Search destination" }),
    );
  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Search ↗", exact: true }).click();
  const opened = await popup;
  expect(opened.url()).toContain("https://duckduckgo.com/?q=home%20lab");
  await opened.close();
});
