import { expect, seedAndAuth, test } from "../fixtures";
import { operatorDesignGroups } from "../helpers/operator-design-fixture";

test("mixed Home cards use paired rows in saved order and stay in place as metrics recover", async ({
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
  await expect(cards.getByRole("heading", { level: 3 })).toHaveText(
    home.items.map((item) => item.label),
  );
  await expect(cards.first().getByRole("button", { name: "Inspect Bambuddy" })).toContainText(
    printerError,
  );

  const cardBoxes = () =>
    cards.evaluateAll((elements) => elements.map((card) => card.getBoundingClientRect().toJSON()));
  const desktop = await cardBoxes();
  const [printer, library, downloader, assistant, tagTeam, norish] = desktop;
  expect(printer.top).toBe(library.top);
  expect(printer.left).toBe(assistant.left);
  expect(printer.bottom).toBe(downloader.top + library.height);
  expect(library.left).toBe(downloader.left);
  expect(library.bottom).toBeLessThan(downloader.top);
  expect(assistant.top).toBeGreaterThan(printer.bottom);
  expect(assistant.bottom).toBe(downloader.bottom);
  expect(tagTeam.top).toBe(norish.top);
  expect(tagTeam.top).toBeGreaterThan(downloader.bottom);
  expect(tagTeam.left).toBe(printer.left);
  expect(norish.left).toBe(library.left);
  expect(library.height).toBeLessThan(printer.height);
  expect(tagTeam.height).toBe(library.height);
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
    const metrics = page.getByRole("button", { name: "Inspect qBittorrent" });
    for (const text of ["Up", "840KB/s"]) {
      await expect(metrics.getByText(text, { exact: true })).toHaveCSS("text-align", "center");
    }
    const boxes = await cardBoxes();
    expect(new Set(boxes.map((box) => box.left)).size).toBe(width === 760 ? 2 : 1);
    if (width === 320) {
      for (const [index, box] of boxes.slice(1).entries())
        expect(box.top).toBeGreaterThan(boxes[index].bottom);
      expect(boxes[1].height).toBeLessThan(boxes[0].height);
      await section.screenshot({ path: "test-results/bento-mobile.png" });
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});
