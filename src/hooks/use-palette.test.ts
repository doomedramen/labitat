import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePalette } from "./use-palette";

describe("usePalette", () => {
  let cookies: string;

  beforeEach(() => {
    cookies = "";
    vi.clearAllMocks();

    // Mock document.cookie
    vi.spyOn(document, "cookie", "get").mockImplementation(() => cookies);
    vi.spyOn(document, "cookie", "set").mockImplementation((value) => {
      cookies = value;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns default palette initially", () => {
    const { result } = renderHook(() => usePalette());
    expect(result.current.palette).toBe("dark");
  });

  it("reads palette from cookie if available", () => {
    cookies = "labitat-palette=dark; path=/";

    const { result } = renderHook(() => usePalette());
    expect(result.current.palette).toBe("dark");
  });

  it("updates palette when setPalette is called", () => {
    const { result } = renderHook(() => usePalette());

    act(() => {
      result.current.setPalette("dark");
    });

    expect(result.current.palette).toBe("dark");
  });

  it("sets cookie when palette changes", () => {
    const { result } = renderHook(() => usePalette());

    act(() => {
      result.current.setPalette("light");
    });

    expect(cookies).toContain("labitat-palette=light");
  });

  it("sets data-palette attribute on document element", () => {
    const { result } = renderHook(() => usePalette());

    act(() => {
      result.current.setPalette("light");
    });

    expect(document.documentElement.getAttribute("data-palette")).toBe("light");
  });

  it("maps a legacy light palette to light before applying it", () => {
    cookies = "labitat-palette=nord_light";
    const { result } = renderHook(() => usePalette());
    expect(result.current.palette).toBe("light");
    expect(document.documentElement).toHaveAttribute("data-palette", "light");
  });

  it("handles cookie errors gracefully", () => {
    vi.spyOn(document, "cookie", "set").mockImplementation(() => {
      throw new Error("Cookie error");
    });

    const { result } = renderHook(() => usePalette());

    // Should not throw
    act(() => {
      result.current.setPalette("dark");
    });

    expect(result.current.palette).toBe("dark");
  });

  it("handles cookie read errors gracefully", () => {
    vi.spyOn(document, "cookie", "get").mockImplementation(() => {
      throw new Error("Cookie read error");
    });

    const { result } = renderHook(() => usePalette());
    expect(result.current.palette).toBe("dark");
  });
});
