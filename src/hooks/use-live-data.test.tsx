import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LiveDataProvider } from "@/hooks/use-live-data";
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
});
