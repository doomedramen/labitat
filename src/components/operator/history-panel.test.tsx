import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import HistoryPanel from "./history-panel";
const metrics = [
  { id: "cpu", label: "CPU", displayValue: "0%", numericValue: 0, unit: "percent" as const },
];
const body = { metric: "cpu", unit: "percent", points: [], transitions: [] };
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
it("requests only while mounted and visible, once per minute, with the first metric and 1h range", async () => {
  vi.useFakeTimers();
  let visibility = "visible";
  vi.spyOn(document, "visibilityState", "get").mockImplementation(
    () => visibility as DocumentVisibilityState,
  );
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => body });
  vi.stubGlobal("fetch", fetcher);
  const view = render(<HistoryPanel itemId="host" metrics={metrics} />);
  await act(async () => {});
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0][0]).toContain("range=1h&metric=cpu");
  await act(() => vi.advanceTimersByTimeAsync(60000));
  expect(fetcher).toHaveBeenCalledTimes(2);
  visibility = "hidden";
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  await act(() => vi.advanceTimersByTimeAsync(120000));
  expect(fetcher).toHaveBeenCalledTimes(2);
  visibility = "visible";
  await act(async () => document.dispatchEvent(new Event("visibilitychange")));
  expect(fetcher).toHaveBeenCalledTimes(3);
  view.unmount();
  expect(fetcher.mock.calls[2][1].signal.aborted).toBe(true);
  await act(() => vi.advanceTimersByTimeAsync(60000));
  expect(fetcher).toHaveBeenCalledTimes(3);
});
it("ignores obsolete range responses", async () => {
  let resolveOld: (value: unknown) => void = () => {};
  const pending = new Promise((resolve) => {
    resolveOld = resolve;
  });
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => pending })
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          ...body,
          transitions: [{ timestamp: 1, state: "healthy", reason: "Latest observation" }],
        }),
      }),
  );
  render(<HistoryPanel itemId="host" metrics={metrics} />);
  await act(async () => {});
  await act(async () =>
    fireEvent.change(screen.getByRole("combobox", { name: "History range" }), {
      target: { value: "6h" },
    }),
  );
  await act(async () =>
    resolveOld({
      ...body,
      transitions: [{ timestamp: 0, state: "error", reason: "Obsolete observation" }],
    }),
  );
  expect(screen.getByText(/Latest observation/)).toBeVisible();
  expect(screen.queryByText(/Obsolete observation/)).toBeNull();
});
