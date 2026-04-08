import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render, fireEvent, act } from "@testing-library/react"
import { ItemIcon } from "./item-icon"

// Next.js Image wraps onLoad internally; replace it with a plain img for unit tests
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    width,
    height,
    className,
    onLoad,
    onError,
  }: React.ImgHTMLAttributes<HTMLImageElement>) =>
    React.createElement("img", {
      src,
      alt,
      width,
      height,
      className,
      onLoad,
      onError,
    }),
}))

// Next.js Image renders as a plain <img> with unoptimized
// jsdom doesn't load real images so we manually fire load/error events

describe("ItemIcon", () => {
  it("renders nothing when iconUrl is 'none'", () => {
    const { container } = render(
      <ItemIcon iconUrl="none" label="Test" href={null} />
    )
    expect(container.firstChild).toBeNull()
  })

  it("renders globe icon when no iconUrl and no href", () => {
    const { container } = render(
      <ItemIcon iconUrl={null} label="Test" href={null} />
    )
    // Should show the globe fallback div, no img
    expect(container.querySelector("img")).toBeNull()
    expect(container.querySelector("svg")).not.toBeNull()
  })

  it("renders invisible image initially when iconUrl is provided", () => {
    const { container } = render(
      <ItemIcon iconUrl="plex.png" label="Plex" href={null} />
    )
    const img = container.querySelector("img")
    expect(img).not.toBeNull()
    // Image should be invisible while loading (no broken-image flash)
    expect(img!.className).toContain("invisible")
  })

  it("makes image visible after onLoad fires", () => {
    const { container } = render(
      <ItemIcon iconUrl="plex.png" label="Plex" href={null} />
    )
    const img = container.querySelector("img")!
    expect(img.className).toContain("invisible")

    act(() => {
      fireEvent.load(img)
    })

    expect(img.className).not.toContain("invisible")
  })

  it("shows globe icon after onError fires (no broken image visible)", () => {
    const { container } = render(
      <ItemIcon iconUrl="plex.png" label="Plex" href={null} />
    )
    const img = container.querySelector("img")!

    act(() => {
      fireEvent.error(img)
    })

    // Image element should be gone, replaced by globe
    expect(container.querySelector("img")).toBeNull()
    expect(container.querySelector("svg")).not.toBeNull()
  })

  it("auto-detects favicon URL from href when no iconUrl", () => {
    const { container } = render(
      <ItemIcon iconUrl={null} label="Test" href="https://plex.tv/web" />
    )
    const img = container.querySelector("img")
    expect(img).not.toBeNull()
    expect(img!.getAttribute("src")).toContain("plex.tv/favicon.ico")
    // Should be invisible while loading
    expect(img!.className).toContain("invisible")
  })

  it("shows globe if favicon auto-detection fails (onError)", () => {
    const { container } = render(
      <ItemIcon iconUrl={null} label="Test" href="https://example.com" />
    )
    const img = container.querySelector("img")!

    act(() => {
      fireEvent.error(img)
    })

    expect(container.querySelector("img")).toBeNull()
    expect(container.querySelector("svg")).not.toBeNull()
  })

  it("renders direct http icon URLs without CDN prefix", () => {
    const { container } = render(
      <ItemIcon
        iconUrl="https://example.com/icon.png"
        label="Test"
        href={null}
      />
    )
    const img = container.querySelector("img")!
    expect(img.getAttribute("src")).toBe("https://example.com/icon.png")
  })

  it("builds selfhst CDN URL for bare slug", () => {
    const { container } = render(
      <ItemIcon iconUrl="plex" label="Plex" href={null} />
    )
    const img = container.querySelector("img")!
    expect(img.getAttribute("src")).toContain("cdn.jsdelivr.net")
    expect(img.getAttribute("src")).toContain("plex")
  })
})
