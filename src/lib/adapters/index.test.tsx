import { describe, it, expect } from "vitest";
import { registry, getService, getAllServices } from "@/lib/adapters";

describe("Service Registry", () => {
  it("exports a registry object", () => {
    expect(registry).toBeDefined();
    expect(typeof registry).toBe("object");
  });

  it("contains multiple services", () => {
    const serviceIds = Object.keys(registry);
    expect(serviceIds.length).toBeGreaterThan(40);
  });

  it("has services with required properties", () => {
    Object.entries(registry).forEach(([id, service]) => {
      expect(service.id).toBe(id);
      expect(service.name).toBeDefined();
      expect(service.icon).toBeDefined();
      expect(service.category).toBeDefined();
      expect(service.configFields).toBeDefined();
      expect(Array.isArray(service.configFields)).toBe(true);
      // Each service must have either toPayload or renderWidget
      expect(service.toPayload || service.renderWidget).toBeDefined();
    });
  });
});

describe("getService", () => {
  it("returns undefined for non-existent service", () => {
    expect(getService("non-existent")).toBeUndefined();
  });

  it("returns service definition for valid ID", () => {
    const service = getService("radarr");
    expect(service).toBeDefined();
    expect(service?.id).toBe("radarr");
    expect(service?.name).toBe("Radarr");
  });

  it("returns different services for different IDs", () => {
    const radarr = getService("radarr");
    const sonarr = getService("sonarr");
    expect(radarr?.id).not.toBe(sonarr?.id);
    expect(radarr?.name).not.toBe(sonarr?.name);
  });
});

describe("getAllServices", () => {
  it("returns an array", () => {
    const services = getAllServices();
    expect(Array.isArray(services)).toBe(true);
  });

  it("returns same count as registry keys", () => {
    const services = getAllServices();
    const registryCount = Object.keys(registry).length;
    expect(services.length).toBe(registryCount);
  });

  it("includes known services", () => {
    const services = getAllServices();
    const ids = services.map((s) => s.id);
    expect(ids).toContain("radarr");
    expect(ids).toContain("sonarr");
    expect(ids).toContain("plex");
    expect(ids).toContain("adguard");
  });
});

describe("Service categories", () => {
  it("has services in each category", () => {
    const services = getAllServices();
    const categories = new Set(services.map((s) => s.category));

    // Verify we have multiple categories represented
    expect(categories.size).toBeGreaterThan(5);
  });

  it("groups services by category correctly", () => {
    const services = getAllServices();
    const downloadsCategory = services.filter((s) => s.category === "downloads");
    const mediaCategory = services.filter((s) => s.category === "media");
    const networkingCategory = services.filter((s) => s.category === "networking");

    expect(downloadsCategory.length).toBeGreaterThan(0);
    expect(mediaCategory.length).toBeGreaterThan(0);
    expect(networkingCategory.length).toBeGreaterThan(0);
  });
});

describe("Service config fields", () => {
  it("all services have at least one config field or empty array", () => {
    const services = getAllServices();
    services.forEach((service) => {
      expect(Array.isArray(service.configFields)).toBe(true);
    });
  });

  it("config fields have required properties", () => {
    const services = getAllServices();
    services.forEach((service) => {
      service.configFields.forEach((field) => {
        expect(field.key).toBeDefined();
        expect(field.label).toBeDefined();
        expect(field.type).toBeDefined();
      });
    });
  });

  it("URL fields are marked as required when needed", () => {
    const radarr = getService("radarr");
    const urlField = radarr?.configFields.find((f) => f.key === "url");
    expect(urlField?.required).toBe(true);
    expect(urlField?.type).toBe("url");
  });
});

describe("Service polling", () => {
  it("some services have defaultPollingMs", () => {
    const services = getAllServices();
    const withPolling = services.filter((s) => s.defaultPollingMs);
    expect(withPolling.length).toBeGreaterThan(0);
  });

  it("polling values are reasonable", () => {
    const services = getAllServices();
    const withPolling = services.filter((s) => s.defaultPollingMs);
    withPolling.forEach((service) => {
      expect(service.defaultPollingMs!).toBeGreaterThan(0);
      expect(service.defaultPollingMs!).toBeLessThanOrEqual(60000);
    });
  });
});

describe("Client-side vs server-side", () => {
  it("identifies client-side services", () => {
    const services = getAllServices();
    const clientSide = services.filter((s) => s.clientSide);
    expect(clientSide.length).toBeGreaterThan(0);
  });

  it("client-side services may or may not have fetchData", () => {
    const services = getAllServices();
    const clientSide = services.filter((s) => s.clientSide);
    // Some client-side services have fetchData for initial config
    clientSide.forEach((service) => {
      expect(service.id).toBeDefined();
    });
  });
});
