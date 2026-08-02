import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";

const originalServiceWorker = Object.getOwnPropertyDescriptor(navigator, "serviceWorker");

const toast = vi.hoisted(() => ({
  info: vi.fn(),
  dismiss: vi.fn(),
}));

vi.mock("sonner", () => ({ toast }));

type Port = {
  onmessage: ((event: MessageEvent) => void) | null;
  close: ReturnType<typeof vi.fn>;
  postMessage: (data: unknown) => void;
};

class MockMessageChannel {
  port1: Port;
  port2: Port;

  constructor() {
    const port1: Port = { onmessage: null, close: vi.fn(), postMessage: vi.fn() };
    const port2: Port = {
      onmessage: null,
      close: vi.fn(),
      postMessage: (data) => port1.onmessage?.({ data } as MessageEvent),
    };
    this.port1 = port1;
    this.port2 = port2;
  }
}

function worker(version?: string) {
  return {
    state: "installed",
    postMessage: vi.fn((message: { type?: string }, ports?: Port[]) => {
      if (message.type === "GET_VERSION" && version) {
        ports?.[0]?.postMessage({ version });
      }
    }),
    addEventListener: vi.fn(),
  };
}

describe("ServiceWorkerRegistrar", () => {
  afterEach(() => {
    vi.useRealTimers();
    toast.info.mockReset();
    toast.dismiss.mockReset();
    if (originalServiceWorker) {
      Object.defineProperty(navigator, "serviceWorker", originalServiceWorker);
    } else {
      Reflect.deleteProperty(navigator, "serviceWorker");
    }
  });

  it("does not claim an update exists when the candidate worker version cannot be verified", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("MessageChannel", MockMessageChannel);

    const activeWorker = worker("labitat-v2");
    const unverifiableWorker = worker();
    const registration = {
      scope: "http://localhost/",
      installing: unverifiableWorker,
      waiting: null,
      addEventListener: vi.fn(),
    };
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        controller: activeWorker,
        register: vi.fn().mockResolvedValue(registration),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });

    render(<ServiceWorkerRegistrar />);
    await act(async () => {
      await Promise.resolve();
      vi.advanceTimersByTime(1_000);
      await Promise.resolve();
    });

    expect(toast.info).not.toHaveBeenCalled();
  });

  it("still notifies when both workers report different versions", async () => {
    vi.stubGlobal("MessageChannel", MockMessageChannel);

    const activeWorker = worker("labitat-v2");
    const updatedWorker = worker("labitat-v3");
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        controller: activeWorker,
        register: vi.fn().mockResolvedValue({
          scope: "http://localhost/",
          installing: updatedWorker,
          waiting: null,
          addEventListener: vi.fn(),
        }),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });

    render(<ServiceWorkerRegistrar />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(toast.info).toHaveBeenCalledOnce();
  });
});
