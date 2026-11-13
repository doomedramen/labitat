import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LiveProvider } from "@/components/dashboard/live-provider";
import { liveStore } from "@/lib/live-store";
import type { ItemLive } from "@/lib/live-types";

const originalVisibilityState = Object.getOwnPropertyDescriptor(document, "visibilityState");

class MockEventSource {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;
  static instances: MockEventSource[] = [];

  readonly url: string;
  readyState = MockEventSource.OPEN;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  close = vi.fn(() => {
    this.readyState = MockEventSource.CLOSED;
  });

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }
}

describe("LiveProvider app resume", () => {
  afterEach(() => {
    MockEventSource.instances = [];
    if (originalVisibilityState) {
      Object.defineProperty(document, "visibilityState", originalVisibilityState);
    } else {
      Reflect.deleteProperty(document, "visibilityState");
    }
  });

  it("replaces an apparently-open SSE connection when a backgrounded tab resumes", () => {
    vi.stubGlobal("EventSource", MockEventSource);

    render(
      <LiveProvider initialSnapshotById={{}} snapshotKey="resume-test" enableSse>
        <div />
      </LiveProvider>,
    );

    expect(MockEventSource.instances).toHaveLength(1);
    const staleConnection = MockEventSource.instances[0]!;
    expect(staleConnection.readyState).toBe(MockEventSource.OPEN);

    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    act(() => document.dispatchEvent(new Event("visibilitychange")));

    expect(staleConnection.close).toHaveBeenCalledOnce();
    expect(MockEventSource.instances).toHaveLength(2);
  });

  it("closes live updates for a hidden tab and reconnects when it is shown", () => {
    vi.useFakeTimers();
    vi.stubGlobal("EventSource", MockEventSource);
    const setVisibility = (value: "hidden" | "visible") => {
      Object.defineProperty(document, "visibilityState", { configurable: true, value });
      act(() => document.dispatchEvent(new Event("visibilitychange")));
    };

    const { unmount } = render(
      <LiveProvider initialSnapshotById={{}} snapshotKey="hidden-test" enableSse>
        <div />
      </LiveProvider>,
    );
    const first = MockEventSource.instances[0]!;

    setVisibility("hidden");
    act(() => vi.advanceTimersByTime(29_000));
    expect(first.close).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1_000));
    expect(first.close).toHaveBeenCalledOnce();
    expect(liveStore.getMeta().sseState).toBe("paused");
    act(() => vi.advanceTimersByTime(120_000));
    expect(MockEventSource.instances).toHaveLength(1);

    setVisibility("visible");
    expect(MockEventSource.instances).toHaveLength(2);
    unmount();
    vi.useRealTimers();
  });

  it("closes live updates after 15 idle minutes and reconnects on input", () => {
    vi.useFakeTimers();
    vi.stubGlobal("EventSource", MockEventSource);
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });

    const { unmount } = render(
      <LiveProvider initialSnapshotById={{}} snapshotKey="idle-test" enableSse>
        <div />
      </LiveProvider>,
    );
    const first = MockEventSource.instances[0]!;

    act(() => vi.advanceTimersByTime(10 * 60_000));
    act(() => window.dispatchEvent(new Event("pointermove")));
    act(() => vi.advanceTimersByTime(10 * 60_000));
    expect(first.close).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(6 * 60_000));
    expect(first.close).toHaveBeenCalledOnce();
    expect(liveStore.getMeta().sseState).toBe("paused");

    act(() => window.dispatchEvent(new Event("keydown")));
    expect(MockEventSource.instances).toHaveLength(2);
    unmount();
    vi.useRealTimers();
  });

  it("reconciles a changed membership snapshot without resetting connection metadata", () => {
    const empty: ItemLive = {
      widgetData: null,
      pingStatus: null,
      configurationRevision: 0,
      observationUpdatedAt: null,
      lastAttemptAt: null,
      lastSuccessAt: null,
      freshness: "unknown",
      lastFetchedAt: null,
      itemLastUpdateAt: null,
    };

    const { rerender } = render(
      <LiveProvider
        initialSnapshotById={{ a: empty, b: empty }}
        snapshotKey="members-a"
        enableSse={false}
      >
        <div />
      </LiveProvider>,
    );

    act(() => {
      liveStore.setSseState("connected");
      liveStore.updateFromSse("a", {
        widgetData: { value: "live" },
        pingStatus: null,
        fetchedAt: 2_000,
        configurationRevision: 0,
        observationUpdatedAt: 2_000,
        freshness: "fresh",
      });
    });

    rerender(
      <LiveProvider
        initialSnapshotById={{
          a: { ...empty, observationUpdatedAt: 1_000, lastFetchedAt: 1_000 },
          c: { ...empty, widgetData: { value: "new" } },
        }}
        snapshotKey="members-b"
        enableSse={false}
      >
        <div />
      </LiveProvider>,
    );

    expect(liveStore.getSnapshot("a")?.widgetData).toEqual({ value: "live" });
    expect(liveStore.getSnapshot("b")).toBeNull();
    expect(liveStore.getSnapshot("c")?.widgetData).toEqual({ value: "new" });
    expect(liveStore.getMeta().sseState).toBe("connected");
  });
});
