import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LiveDataProvider } from "@/hooks/use-live-data";
import { ItemStatusDot } from "@/components/dashboard/item/item-status-dot";
import type { ItemWithCache } from "@/lib/types";

class MockEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;
  static instances: MockEventSource[] = [];

  readyState = MockEventSource.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public readonly url: string) {
    MockEventSource.instances.push(this);
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
  }
}

describe("LiveDataProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockEventSource.instances = [];
    vi.stubGlobal("EventSource", MockEventSource);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("opens a new EventSource after the server asks the client to reconnect", async () => {
    const view = render(
      <LiveDataProvider>
        <div>child</div>
      </LiveDataProvider>,
    );

    expect(MockEventSource.instances).toHaveLength(1);

    const firstConnection = MockEventSource.instances[0];
    firstConnection.readyState = MockEventSource.OPEN;
    firstConnection.onopen?.();
    firstConnection.onmessage?.({
      data: JSON.stringify({ type: "reconnect" }),
    } as MessageEvent<string>);

    await vi.advanceTimersByTimeAsync(1000);

    expect(MockEventSource.instances).toHaveLength(2);

    view.unmount();
  });

  it("updates the status dot when an SSE widget update changes status", () => {
    const item: ItemWithCache = {
      id: "live-dot-item",
      groupId: "group-1",
      label: "Live Dot",
      href: "https://live-dot.test",
      iconUrl: null,
      serviceType: "radarr",
      serviceUrl: "https://live-dot.test",
      configEnc: null,
      order: 0,
      pollingMs: 10000,
      cleanMode: false,
      displayMode: "label",
      statDisplayMode: "label",
      statCardOrder: null,
      createdAt: null,
      cachedWidgetData: null,
      cachedPingStatus: null,
    };

    const view = render(
      <LiveDataProvider>
        <ItemStatusDot item={item} editMode={false} />
      </LiveDataProvider>,
    );

    // Check initial unknown state - color class is on the inner dot, not the container
    const unknownDot = screen.getByRole("status", { name: "Status unknown" });
    expect(unknownDot.querySelector('[class*="bg-muted-foreground"]')).toBeInTheDocument();

    act(() => {
      MockEventSource.instances[0].onmessage?.({
        data: JSON.stringify({
          type: "update",
          itemId: item.id,
          widgetData: { _status: "ok", movies: 42 },
        }),
      } as MessageEvent<string>);
    });

    // Check healthy state - color class is on the inner dot
    const healthyDot = screen.getByRole("status", { name: "Healthy" });
    expect(healthyDot.querySelector(".bg-success")).toBeInTheDocument();

    view.unmount();
  });

  it("shows a spinner overlay while status comes from cached data, then removes it on live update", () => {
    const item: ItemWithCache = {
      id: "cached-dot-item",
      groupId: "group-1",
      label: "Cached Dot",
      href: "https://cached-dot.test",
      iconUrl: null,
      serviceType: "radarr",
      serviceUrl: "https://cached-dot.test",
      configEnc: null,
      order: 0,
      pollingMs: 10000,
      cleanMode: false,
      displayMode: "label",
      statDisplayMode: "label",
      statCardOrder: null,
      createdAt: null,
      cachedWidgetData: { _status: "ok", movies: 41 },
      cachedPingStatus: null,
    };

    const view = render(
      <LiveDataProvider>
        <ItemStatusDot item={item} editMode={false} />
      </LiveDataProvider>,
    );

    const cachedStatus = screen.getByRole("status", { name: "Healthy (cached)" });
    expect(cachedStatus).toBeInTheDocument();

    // When cached, there's no progress ring - just the pulsing dot
    const cachedRing = cachedStatus.querySelector("circle");
    expect(cachedRing).toBeNull();

    act(() => {
      MockEventSource.instances[0].onmessage?.({
        data: JSON.stringify({
          type: "update",
          itemId: item.id,
          widgetData: { _status: "ok", movies: 42 },
        }),
      } as MessageEvent<string>);
    });

    const liveStatus = screen.getByRole("status", { name: "Healthy" });
    expect(liveStatus).toBeInTheDocument();

    // When live, the progress ring should be present with reduced opacity background
    const liveRing = liveStatus.querySelector("circle");
    expect(liveRing).not.toBeNull();
    expect(liveRing).toHaveStyle({ opacity: "0.2" });

    view.unmount();
  });

  it("shows degraded status with reason when provided", () => {
    const item: ItemWithCache = {
      id: "degraded-item",
      groupId: "group-1",
      label: "Degraded Item",
      href: "https://degraded.test",
      iconUrl: null,
      serviceType: "generic-ping",
      serviceUrl: "https://degraded.test",
      configEnc: null,
      order: 0,
      pollingMs: 10000,
      cleanMode: false,
      displayMode: "label",
      statDisplayMode: "label",
      statCardOrder: null,
      createdAt: null,
      cachedWidgetData: { _status: "warn", _statusText: "High latency" },
      cachedPingStatus: null,
    };

    render(
      <LiveDataProvider>
        <ItemStatusDot item={item} editMode={false} />
      </LiveDataProvider>,
    );

    expect(
      screen.getByRole("status", { name: "Degraded: High latency (cached)" }),
    ).toBeInTheDocument();
  });

  it("shows status dot for services without an href", () => {
    const item: ItemWithCache = {
      id: "no-href-service",
      groupId: "group-1",
      label: "No Href Service",
      href: null,
      iconUrl: null,
      serviceType: "pihole",
      serviceUrl: "https://pihole.test",
      configEnc: null,
      order: 0,
      pollingMs: 10000,
      cleanMode: false,
      displayMode: "label",
      statDisplayMode: "label",
      statCardOrder: null,
      createdAt: null,
      cachedWidgetData: { _status: "ok" },
      cachedPingStatus: null,
    };

    render(
      <LiveDataProvider>
        <ItemStatusDot item={item} editMode={false} />
      </LiveDataProvider>,
    );

    expect(screen.getByRole("status", { name: "Healthy (cached)" })).toBeInTheDocument();
  });
});
