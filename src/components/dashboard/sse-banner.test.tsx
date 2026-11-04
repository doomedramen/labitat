import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const meta = vi.hoisted(() => ({ sseState: "connecting", lastUpdateAt: null }));
vi.mock("./use-item-live", () => ({ useLiveMeta: () => meta }));
vi.mock("@/components/ui/overlay-portal", () => ({
  OverlayPortal: ({ children }: { children: React.ReactNode }) => children,
}));
import { SseBanner } from "./sse-banner";
afterEach(() => vi.useRealTimers());
it("shows an initial outage after three seconds even while retries change state", () => {
  vi.useFakeTimers();
  const { rerender } = render(<SseBanner />);
  act(() => vi.advanceTimersByTime(1000));
  meta.sseState = "disconnected";
  rerender(<SseBanner />);
  act(() => vi.advanceTimersByTime(1000));
  meta.sseState = "connecting";
  rerender(<SseBanner />);
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByRole("status")).toHaveTextContent("Live updates unavailable");
  meta.sseState = "connected";
  rerender(<SseBanner />);
  expect(screen.queryByRole("status")).toBeNull();
});
