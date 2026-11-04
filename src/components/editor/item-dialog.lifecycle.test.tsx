import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LiveProvider } from "@/components/dashboard/live-provider";
import { ItemDialog } from "./item-dialog";
import type { ItemWithCache } from "@/lib/types";
import { getItemConfig, updateItem } from "@/actions/items";
vi.mock("web-haptics/react", () => ({ useWebHaptics: () => ({ trigger: vi.fn() }) }));
vi.mock("@/actions/items", () => ({
  createItem: vi.fn(),
  updateItem: vi.fn(),
  getItemConfig: vi.fn(),
}));
vi.mock("@/actions/services", () => ({ fetchServiceData: vi.fn().mockResolvedValue({}) }));
const item: ItemWithCache = {
  id: "life-a",
  label: "Original",
  groupId: "g1",
  href: null,
  iconUrl: null,
  serviceType: "radarr",
  serviceUrl: "https://radarr.test",
  configEnc: null,
  configurationRevision: 0,
  order: 0,
  pollingMs: 10000,
  displayMode: "label",
  statDisplayMode: "label",
  statCardOrder: null,
  createdAt: null,
  cachedWidgetData: null,
  cachedPingStatus: null,
  cachedDataAge: null,
};
function dialog(current = item, onClose = vi.fn()) {
  return (
    <LiveProvider initialSnapshotById={{}} snapshotKey="life" enableSse={false}>
      <ItemDialog
        open
        item={current}
        onOpenChange={onClose}
        groupId="g1"
        onGroupsChanged={vi.fn()}
      />
    </LiveProvider>
  );
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("item configuration lifecycle", () => {
  it("prevents saving before credentials load", async () => {
    const load = deferred<Record<string, string>>();
    vi.mocked(getItemConfig).mockReturnValue(load.promise);
    render(dialog());
    expect(screen.getByRole("button", { name: "Update" })).toBeDisabled();
    await act(async () => load.resolve({ apiKey: "test-key" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Update" })).toBeEnabled());
  });
  it("ignores a superseded configuration response", async () => {
    const first = deferred<Record<string, string>>();
    const second = deferred<Record<string, string>>();
    vi.mocked(getItemConfig).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { rerender } = render(dialog());
    rerender(dialog({ ...item, id: "life-b", label: "Second" }));
    await act(async () => second.resolve({ apiKey: "second-key" }));
    await act(async () => first.resolve({ apiKey: "old-key" }));
    expect(screen.getByLabelText("API Key")).toHaveValue("second-key");
  });
  it("retains the draft and prevents duplicate writes while saving", async () => {
    vi.mocked(getItemConfig).mockResolvedValue({ apiKey: "test-key" });
    const save = deferred<never>();
    vi.mocked(updateItem).mockReturnValue(save.promise);
    render(dialog());
    await screen.findByDisplayValue("test-key");
    fireEvent.change(screen.getByLabelText("Label", { exact: true }), {
      target: { value: "My draft" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    await waitFor(() => expect(updateItem).toHaveBeenCalledTimes(1));
    const submitted = vi.mocked(updateItem).mock.calls[0][1];
    expect(submitted.has("config_enableQueue")).toBe(false);
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    expect(screen.getByLabelText("Label", { exact: true })).toHaveValue("My draft");
  });
});
