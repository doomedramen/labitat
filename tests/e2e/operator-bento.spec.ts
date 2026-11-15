import { expect, seedAndAuth, test } from "../fixtures";
import { operatorDesignGroups } from "../helpers/operator-design-fixture";
import { noOverlap } from "../helpers/operator";

test("mixed Home services pack as cards then chips in saved order and stay in place as metrics recover", async ({
  page,
}) => {
  const home = operatorDesignGroups.find((group) => group.name === "Home")!;
  const downloads = operatorDesignGroups.find((group) => group.name === "Downloads")!;
  const printerError = "Printer connection unavailable";
  await page.setViewportSize({ width: 1800, height: 900 });
  await page.route("**/api/events", (route) => route.abort());
  await seedAndAuth(page, {
    groups: [
      {
        ...home,
        items: home.items.map((item) =>
          item.label === "Bambuddy"
            ? { ...item, cachedWidgetData: { _status: "error", _statusText: printerError } }
            : item,
        ),
      },
      downloads,
    ],
  });
  await page.goto("/");
  const section = page.locator("section[data-group-id]").filter({
    has: page.getByRole("heading", { name: "Home", exact: true }),
  });
  const cards = section.getByTestId("item-card");
  const saved = home.items.map((item) => item.label);
  const labels = async (layout: string) =>
    section
      .locator(`[data-testid="item-card"][data-layout="${layout}"] h3`)
      .evaluateAll((headings) => headings.map((heading) => heading.textContent ?? ""));
  const statCards = await labels("metrics");
  const chips = await labels("launcher");
  // Cards come first, then chips; each keeps the saved order.
  expect([...statCards, ...chips].sort()).toEqual([...saved].sort());
  expect(statCards).toEqual(saved.filter((label) => statCards.includes(label)));
  expect(chips).toEqual(saved.filter((label) => chips.includes(label)));
  await expect(cards.first().getByRole("button", { name: "Inspect Bambuddy" })).toContainText(
    printerError,
  );

  const cardBoxes = () =>
    cards.evaluateAll((elements) => elements.map((card) => card.getBoundingClientRect().toJSON()));
  const desktop = await cardBoxes();
  expect(noOverlap(desktop)).toBe(true);
  const itemId = await cards.first().getAttribute("data-item-id");
  await page.unroute("**/api/events");
  await page.route("**/api/events", (route) => {
    const now = Date.now() + 1000;
    return route.fulfill({
      contentType: "text/event-stream",
      body: `data: ${JSON.stringify({
        type: "update",
        itemId,
        widgetData: { _status: "ok", printers: 1, online: 1, printing: 0, paused: 0 },
        pingStatus: null,
        fetchedAt: now,
        observationUpdatedAt: now,
        lastSuccessAt: now,
        lastAttemptAt: now,
        freshness: "fresh",
        configurationRevision: 0,
      })}\n\n`,
    });
  });
  await page.reload();
  await expect(cards.first().getByText("Printers", { exact: true })).toBeVisible();
  expect(await cardBoxes()).toEqual(desktop);
  await section.screenshot({ path: "test-results/bento-desktop.png" });

  for (const width of [760, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(async () => noOverlap(await cardBoxes())).toBe(true);
    const boxes = await cardBoxes();
    expect(boxes.every((box) => box.left >= 0 && box.right <= width)).toBe(true);
    if (width === 320) await section.screenshot({ path: "test-results/bento-mobile.png" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});
