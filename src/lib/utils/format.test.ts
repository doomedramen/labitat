import { describe, it, expect } from "vitest";
import { formatBytes, formatDuration, formatTimeAgo, formatTimeLeft } from "@/lib/utils/format";

describe("formatBytes", () => {
  it("formats 0 bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats bytes", () => {
    expect(formatBytes(512)).toBe("512.0 B");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(15728640)).toBe("15.0 MB");
  });

  it("formats gigabytes", () => {
    expect(formatBytes(2147483648)).toBe("2.0 GB");
  });

  it("formats terabytes", () => {
    expect(formatBytes(1099511627776)).toBe("1.0 TB");
  });

  it("formats fractional values", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("formats 1 byte", () => {
    expect(formatBytes(1)).toBe("1.0 B");
  });

  it("handles NaN", () => {
    expect(formatBytes(NaN)).toBe("—");
  });

  it("handles negative values", () => {
    expect(formatBytes(-1)).toBe("—");
  });

  it("handles Infinity", () => {
    expect(formatBytes(Infinity)).toBe("—");
  });
});

describe("formatDuration", () => {
  it("formats seconds only as minutes", () => {
    expect(formatDuration(120)).toBe("2m");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration(3661)).toBe("1h 1m");
  });

  it("formats days and hours", () => {
    expect(formatDuration(90000)).toBe("1d 1h");
  });

  it("formats zero seconds", () => {
    expect(formatDuration(0)).toBe("0m");
  });

  it("handles negative values", () => {
    expect(formatDuration(-1)).toBe("∞");
  });

  it("handles Infinity", () => {
    expect(formatDuration(Infinity)).toBe("∞");
  });

  it("handles NaN", () => {
    expect(formatDuration(NaN)).toBe("∞");
  });

  it("formats exact hour", () => {
    expect(formatDuration(3600)).toBe("1h 0m");
  });

  it("formats less than a minute", () => {
    expect(formatDuration(30)).toBe("0m");
  });
});

describe("formatTimeAgo", () => {
  it("formats seconds", () => {
    expect(formatTimeAgo(30)).toBe("30s ago");
  });

  it("formats minutes", () => {
    expect(formatTimeAgo(120)).toBe("2m ago");
  });

  it("formats hours and minutes", () => {
    expect(formatTimeAgo(7200)).toBe("2h 0m ago");
  });

  it("formats mixed hours and minutes", () => {
    expect(formatTimeAgo(7260)).toBe("2h 1m ago");
  });

  it("formats less than 60 seconds", () => {
    expect(formatTimeAgo(45)).toBe("45s ago");
  });

  it("formats exactly 1 minute", () => {
    expect(formatTimeAgo(60)).toBe("1m ago");
  });

  it("rounds seconds", () => {
    expect(formatTimeAgo(33.7)).toBe("34s ago");
  });
});

describe("formatTimeLeft", () => {
  it("returns empty string for zero", () => {
    expect(formatTimeLeft(0)).toBe("");
  });

  it("returns empty string for negative", () => {
    expect(formatTimeLeft(-5)).toBe("");
  });

  it("formats minutes only", () => {
    expect(formatTimeLeft(30)).toBe("30m");
  });

  it("formats hours and minutes", () => {
    expect(formatTimeLeft(90)).toBe("1h 30m");
  });

  it("formats exactly 1 hour", () => {
    expect(formatTimeLeft(60)).toBe("1h 0m");
  });

  it("rounds minutes", () => {
    expect(formatTimeLeft(45.7)).toBe("46m");
  });

  it("formats large hours", () => {
    expect(formatTimeLeft(180)).toBe("3h 0m");
  });
});
