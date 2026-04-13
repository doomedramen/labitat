import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { glancesDiskUsageDefinition } from "@/lib/adapters/glances-diskusage";

describe("glances-diskusage definition", () => {
  it("has correct metadata", () => {
    expect(glancesDiskUsageDefinition.id).toBe("glances-diskusage");
    expect(glancesDiskUsageDefinition.name).toBe("Glances Disk Usage");
    expect(glancesDiskUsageDefinition.icon).toBe("glances");
    expect(glancesDiskUsageDefinition.category).toBe("monitoring");
    expect(glancesDiskUsageDefinition.defaultPollingMs).toBe(15_000);
  });

  it("has configFields defined", () => {
    expect(glancesDiskUsageDefinition.configFields).toBeDefined();
    expect(glancesDiskUsageDefinition.configFields).toHaveLength(4);
    expect(glancesDiskUsageDefinition.configFields[0].key).toBe("url");
    expect(glancesDiskUsageDefinition.configFields[0].type).toBe("url");
    expect(glancesDiskUsageDefinition.configFields[0].required).toBe(true);
    expect(glancesDiskUsageDefinition.configFields[3].key).toBe("mountPoint");
    expect(glancesDiskUsageDefinition.configFields[3].type).toBe("text");
    expect(glancesDiskUsageDefinition.configFields[3].required).toBe(false);
  });

  describe("fetchData", () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("fetches data successfully", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              size: 1000000000000,
              used: 500000000000,
              free: 500000000000,
            }),
        }),
      );

      const result = await glancesDiskUsageDefinition.fetchData!({
        url: "https://glances.example.com/",
      });

      expect(result._status).toBe("ok");
      expect(result.usedPercent).toBe(50);
      expect(result.used).toBe("465.7 GB");
      expect(result.total).toBe("931.3 GB");
      expect(result.free).toBe("465.7 GB");
    });

    it("throws on error response", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 500 }));

      await expect(
        glancesDiskUsageDefinition.fetchData!({
          url: "https://glances.example.com",
        }),
      ).rejects.toThrow("Glances error: 500");
    });

    it("handles empty data with defaults", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        }),
      );

      const result = await glancesDiskUsageDefinition.fetchData!({
        url: "https://glances.example.com",
      });

      expect(result.usedPercent).toBe(0);
      expect(result.used).toBe("0 B");
      expect(result.total).toBe("0 B");
      expect(result.free).toBe("0 B");
    });

    it("uses custom mount point", async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ size: 0, used: 0, free: 0 }),
        }),
      );
      vi.stubGlobal("fetch", mockFetch);

      await glancesDiskUsageDefinition.fetchData!({
        url: "https://glances.example.com",
        mountPoint: "/data",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://glances.example.com/api/4/fs/%2Fdata",
        expect.any(Object),
      );
    });

    it("uses Basic auth when credentials provided", async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ size: 0, used: 0, free: 0 }),
        }),
      );
      vi.stubGlobal("fetch", mockFetch);

      await glancesDiskUsageDefinition.fetchData!({
        url: "https://glances.example.com",
        username: "admin",
        password: "secret",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://glances.example.com/api/4/fs/%2F",
        expect.objectContaining({
          headers: {
            Authorization: `Basic ${btoa("admin:secret")}`,
          },
        }),
      );
    });
  });

  describe("renderWidget", () => {
    it("is defined", () => {
      expect(glancesDiskUsageDefinition.renderWidget).toBeDefined();
      expect(typeof glancesDiskUsageDefinition.renderWidget).toBe("function");
    });
  });
});
