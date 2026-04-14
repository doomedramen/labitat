import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBackground } from "./use-background";

describe("useBackground", () => {
  let cookies: string;

  beforeEach(() => {
    cookies = "";
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Mock document.cookie
    vi.spyOn(document, "cookie", "get").mockImplementation(() => cookies);
    vi.spyOn(document, "cookie", "set").mockImplementation((value) => {
      cookies = value;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns default background initially", () => {
    const { result } = renderHook(() => useBackground());
    expect(result.current.background).toBe("none");
    expect(result.current.scale).toBe("1");
    expect(result.current.opacity).toBe("1");
  });

  it("reads background from cookie if available", () => {
    cookies = "labitat-background=gradient; path=/";

    const { result } = renderHook(() => useBackground());
    expect(result.current.background).toBe("gradient");
  });

  it("updates background when setBackground is called", () => {
    const { result } = renderHook(() => useBackground());

    act(() => {
      result.current.setBackground("gradient");
    });

    expect(result.current.background).toBe("gradient");
  });

  it("sets cookie when background changes", () => {
    const { result } = renderHook(() => useBackground());

    act(() => {
      result.current.setBackground("circles");
    });

    expect(cookies).toContain("labitat-background=circles");
  });

  it("sets data-background attribute on document element", () => {
    const { result } = renderHook(() => useBackground());

    act(() => {
      result.current.setBackground("boxes");
    });

    expect(document.documentElement.getAttribute("data-background")).toBe("boxes");
  });

  it("updates scale when setScale is called", () => {
    const { result } = renderHook(() => useBackground());

    act(() => {
      result.current.setScale("1.5");
    });

    expect(result.current.scale).toBe("1.5");
    expect(document.documentElement.style.getPropertyValue("--bg-scale")).toBe("1.5");
  });

  it("updates opacity when setOpacity is called", () => {
    const { result } = renderHook(() => useBackground());

    act(() => {
      result.current.setOpacity("0.5");
    });

    expect(result.current.opacity).toBe("0.5");
    expect(document.documentElement.style.getPropertyValue("--bg-opacity")).toBe("0.5");
  });

  it("debounces scale persistence", () => {
    const { result } = renderHook(() => useBackground());

    act(() => {
      result.current.setScale("2");
    });

    // Cookie should not be set immediately
    expect(cookies).not.toContain("labitat-bg-scale=2");

    // After debounce time, cookie should be set
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(cookies).toContain("labitat-bg-scale=2");
  });

  it("debounces opacity persistence", () => {
    const { result } = renderHook(() => useBackground());

    act(() => {
      result.current.setOpacity("0.8");
    });

    // Cookie should not be set immediately
    expect(cookies).not.toContain("labitat-bg-opacity=0.8");

    // After debounce time, cookie should be set
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(cookies).toContain("labitat-bg-opacity=0.8");
  });

  it("persists cookies on window blur", () => {
    const { result } = renderHook(() => useBackground());

    act(() => {
      result.current.setScale("1.2");
      result.current.setOpacity("0.9");
    });

    act(() => {
      window.dispatchEvent(new Event("blur"));
    });

    expect(cookies).toMatch(/labitat-bg-(scale|opacity)=/);
  });

  it("cleans up blur listener on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useBackground());
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("blur", expect.any(Function));
  });

  it("handles cookie errors gracefully", () => {
    vi.spyOn(document, "cookie", "set").mockImplementation(() => {
      throw new Error("Cookie error");
    });

    const { result } = renderHook(() => useBackground());

    // Should not throw
    act(() => {
      result.current.setBackground("gradient");
      result.current.setScale("1.5");
      result.current.setOpacity("0.5");
    });

    expect(result.current.background).toBe("gradient");
  });

  it("reads scale from cookie if available", () => {
    cookies = "labitat-background=none; labitat-bg-scale=2; labitat-bg-opacity=0.5";

    const { result } = renderHook(() => useBackground());
    expect(result.current.scale).toBe("2");
    expect(result.current.opacity).toBe("0.5");
  });
});
