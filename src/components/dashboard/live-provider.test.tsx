import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LiveProvider } from "@/components/dashboard/live-provider";

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
});
