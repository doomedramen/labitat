import { expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LiveProvider } from "@/components/dashboard/live-provider";
import type { GroupWithItems } from "@/lib/types";
import type { ItemLive } from "@/lib/live-types";
import { getService } from "@/lib/adapters";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("web-haptics/react", () => ({ useWebHaptics: () => ({ trigger: vi.fn() }) }));
vi.mock("@/actions/layout", () => ({ saveDashboardLayout: vi.fn() }));
vi.mock("@/actions/items", () => ({
  deleteItem: vi.fn(),
  createItem: vi.fn(),
  updateItem: vi.fn(),
  getItemConfig: vi.fn(),
}));
vi.mock("@/actions/groups", () => ({
  deleteGroup: vi.fn(),
  createGroup: vi.fn(),
  updateGroup: vi.fn(),
}));
vi.mock("@/actions/settings", () => ({ updateDashboardTitle: vi.fn() }));
vi.mock("@/actions/auth", () => ({ logout: vi.fn(), login: vi.fn() }));
vi.mock("@/actions/services", () => ({
  fetchServiceData: vi.fn(),
  getClientWidgetConfig: vi.fn(),
}));
import { OperatorDashboard } from "./operator-dashboard";
it("opening details in a 100-service fixture does not render every tile again", async () => {
  window.history.replaceState({}, "", "/");
  const now = Date.now();
  const group: GroupWithItems = {
    id: "g",
    name: "Hosts",
    order: 0,
    createdAt: null,
    items: Array.from({ length: 100 }, (_, index) => ({
      id: `host-${index}`,
      groupId: "g",
      label: `Host ${index}`,
      href: null,
      serviceType: "radarr",
      serviceUrl: null,
      iconUrl: null,
      configEnc: null,
      configurationRevision: 0,
      pollingMs: 30000,
      order: index,
      displayMode: "label",
      statDisplayMode: "label",
      statCardOrder: null,
      createdAt: null,
    })),
  };
  const snapshot: Record<string, ItemLive> = Object.fromEntries(
    group.items.map((item) => [
      item.id,
      {
        widgetData: { _status: "ok", queued: 0, missing: 0, wanted: 0, movies: 42 },
        pingStatus: null,
        configurationRevision: 0,
        observationUpdatedAt: now,
        lastSuccessAt: now,
        lastAttemptAt: now,
        lastFetchedAt: now,
        itemLastUpdateAt: null,
        freshness: "fresh",
      },
    ]),
  );
  const groups = [group];
  const payload = vi.spyOn(getService("radarr")!, "toPayload");
  const tree = () => (
    <LiveProvider initialSnapshotById={snapshot} snapshotKey="operator-100" enableSse={false}>
      <OperatorDashboard
        groups={groups}
        revision={0}
        title="Profile"
        canEdit={false}
        initialSnapshotById={snapshot}
        serverNow={now}
      />
    </LiveProvider>
  );
  const view = render(tree());
  await waitFor(() => expect(screen.getAllByTestId("item-card")).toHaveLength(100));
  payload.mockClear();
  fireEvent.click(screen.getByRole("button", { name: "Inspect Host 0" }));
  view.rerender(tree());
  await screen.findByRole("dialog", { name: "Host 0" });
  // Details normalize metrics and render activity; the other 99 tiles stay memoized.
  expect(payload.mock.calls.length).toBeLessThanOrEqual(2);
  payload.mockRestore();
  window.history.replaceState({}, "", "/");
});
