import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";

vi.mock("net", () => ({
  createConnection: vi.fn(),
}));

import { nutDefinition } from "@/lib/adapters/nut";
import * as net from "net";

type MockSocket = net.Socket & {
  write: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
};

function createMockSocket(): MockSocket {
  const socket = new EventEmitter() as MockSocket;
  socket.write = vi.fn() as typeof socket.write;
  socket.destroy = vi.fn() as typeof socket.destroy;
  socket.end = vi.fn() as typeof socket.end;
  return socket;
}

function wireLines(upsName: string, vars: [string, string][]): string {
  return [
    `BEGIN LIST VAR ${upsName}`,
    ...vars.map(([key, value]) => `VAR ${upsName} ${key} "${value}"`),
    `END LIST VAR ${upsName}`,
    "",
  ].join("\n");
}

describe("nut definition", () => {
  it("has correct metadata", () => {
    expect(nutDefinition.id).toBe("nut");
    expect(nutDefinition.name).toBe("NUT UPS");
    expect(nutDefinition.icon).toBe("network-ups-tools");
    expect(nutDefinition.category).toBe("monitoring");
    expect(nutDefinition.defaultPollingMs).toBe(15_000);
  });

  it("has configFields defined", () => {
    expect(nutDefinition.configFields).toBeDefined();
    expect(nutDefinition.configFields).toHaveLength(5);
    expect(nutDefinition.configFields[0].key).toBe("host");
    expect(nutDefinition.configFields[0].type).toBe("text");
    expect(nutDefinition.configFields[0].required).toBe(true);
    expect(nutDefinition.configFields[1].key).toBe("port");
    expect(nutDefinition.configFields[1].type).toBe("number");
    expect(nutDefinition.configFields[2].key).toBe("upsName");
    expect(nutDefinition.configFields[2].type).toBe("text");
    expect(nutDefinition.configFields[2].required).toBe(true);
    expect(nutDefinition.configFields[3].key).toBe("username");
    expect(nutDefinition.configFields[3].required).toBe(false);
    expect(nutDefinition.configFields[4].key).toBe("password");
    expect(nutDefinition.configFields[4].type).toBe("password");
    expect(nutDefinition.configFields[4].required).toBe(false);
  });

  describe("fetchData", () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("fetches data successfully via TCP", async () => {
      const mockSocket = createMockSocket();

      vi.mocked(net.createConnection).mockImplementation((_options, callback) => {
        setTimeout(() => callback?.(), 0);

        mockSocket.write.mockImplementation((data: string) => {
          if (data.startsWith("LIST VAR")) {
            setTimeout(() => {
              mockSocket.emit(
                "data",
                wireLines("myups", [
                  ["ups.status", "OL"],
                  ["battery.charge", "100.0"],
                  ["battery.runtime", "2100"],
                  ["ups.load", "45.2"],
                ]),
              );
            }, 5);
          }
          return true;
        });

        return mockSocket;
      });

      const result = await nutDefinition.fetchData!({
        host: "192.168.1.100",
        port: "3493",
        upsName: "myups",
      });

      expect(result._status).toBe("ok");
      expect(result.status).toBe("OL");
      expect(result.batteryCharge).toBe(100);
      expect(result.runtimeSeconds).toBe(2100);
      expect(result.loadPercent).toBe(45.2);
    });

    it("parses multi-code ups.status (on battery + low battery)", async () => {
      const mockSocket = createMockSocket();

      vi.mocked(net.createConnection).mockImplementation((_options, callback) => {
        setTimeout(() => callback?.(), 0);

        mockSocket.write.mockImplementation((data: string) => {
          if (data.startsWith("LIST VAR")) {
            setTimeout(() => {
              mockSocket.emit(
                "data",
                wireLines("myups", [
                  ["ups.status", "OB LB"],
                  ["battery.charge", "10.0"],
                  ["battery.runtime", "120"],
                  ["ups.load", "80"],
                ]),
              );
            }, 5);
          }
          return true;
        });

        return mockSocket;
      });

      const result = await nutDefinition.fetchData!({
        host: "192.168.1.100",
        port: "3493",
        upsName: "myups",
      });

      expect(result.status).toBe("OB LB");
      expect(result._status).toBe("warn");
      expect(result._statusText).toBe("UPS Status: OB LB");
    });

    it("authenticates with username/password before querying", async () => {
      const mockSocket = createMockSocket();
      const writes: string[] = [];

      vi.mocked(net.createConnection).mockImplementation((_options, callback) => {
        setTimeout(() => callback?.(), 0);

        mockSocket.write.mockImplementation((data: string) => {
          writes.push(data);
          if (data.startsWith("USERNAME")) {
            setTimeout(() => mockSocket.emit("data", "OK\n"), 1);
          } else if (data.startsWith("PASSWORD")) {
            setTimeout(() => mockSocket.emit("data", "OK\n"), 1);
          } else if (data.startsWith("LIST VAR")) {
            setTimeout(() => {
              mockSocket.emit(
                "data",
                wireLines("myups", [
                  ["ups.status", "OL"],
                  ["battery.charge", "100"],
                  ["battery.runtime", "1800"],
                  ["ups.load", "20"],
                ]),
              );
            }, 1);
          }
          return true;
        });

        return mockSocket;
      });

      const result = await nutDefinition.fetchData!({
        host: "192.168.1.100",
        port: "3493",
        upsName: "myups",
        username: "monuser",
        password: "secret",
      });

      expect(writes[0]).toBe("USERNAME monuser\n");
      expect(writes[1]).toBe("PASSWORD secret\n");
      expect(writes[2]).toBe("LIST VAR myups\n");
      expect(result.status).toBe("OL");
    });

    it("throws an auth failure error when USERNAME/PASSWORD is rejected", async () => {
      const mockSocket = createMockSocket();

      vi.mocked(net.createConnection).mockImplementation((_options, callback) => {
        setTimeout(() => callback?.(), 0);

        mockSocket.write.mockImplementation((data: string) => {
          if (data.startsWith("USERNAME")) {
            setTimeout(() => mockSocket.emit("data", "ERR ACCESS-DENIED\n"), 1);
          }
          return true;
        });

        return mockSocket;
      });

      await expect(
        nutDefinition.fetchData!({
          host: "192.168.1.100",
          port: "3493",
          upsName: "myups",
          username: "baduser",
          password: "wrong",
        }),
      ).rejects.toThrow("ERR ACCESS-DENIED");
    });

    it("throws on unknown UPS name", async () => {
      const mockSocket = createMockSocket();

      vi.mocked(net.createConnection).mockImplementation((_options, callback) => {
        setTimeout(() => callback?.(), 0);

        mockSocket.write.mockImplementation((data: string) => {
          if (data.startsWith("LIST VAR")) {
            setTimeout(() => mockSocket.emit("data", "ERR UNKNOWN-UPS\n"), 1);
          }
          return true;
        });

        return mockSocket;
      });

      await expect(
        nutDefinition.fetchData!({
          host: "192.168.1.100",
          port: "3493",
          upsName: "nonexistent",
        }),
      ).rejects.toThrow("ERR UNKNOWN-UPS");
    });

    it("throws error when TCP connection fails", async () => {
      const mockSocket = createMockSocket();

      vi.mocked(net.createConnection).mockImplementation(() => {
        setTimeout(() => mockSocket.emit("error", new Error("Connection refused")), 5);
        return mockSocket;
      });

      await expect(
        nutDefinition.fetchData!({
          host: "192.168.1.100",
          port: "3493",
          upsName: "myups",
        }),
      ).rejects.toThrow("TCP connection to 192.168.1.100:3493 failed");
    });

    it("throws when host is missing", async () => {
      await expect(
        nutDefinition.fetchData!({
          upsName: "myups",
        }),
      ).rejects.toThrow("Host is required");
    });

    it("throws when UPS name is missing", async () => {
      await expect(
        nutDefinition.fetchData!({
          host: "192.168.1.100",
        }),
      ).rejects.toThrow("UPS name is required");
    });
  });

  describe("status mapping", () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    const runWithStatus = async (status: string) => {
      const mockSocket = createMockSocket();

      vi.mocked(net.createConnection).mockImplementation((_options, callback) => {
        setTimeout(() => callback?.(), 0);

        mockSocket.write.mockImplementation((data: string) => {
          if (data.startsWith("LIST VAR")) {
            setTimeout(() => {
              mockSocket.emit(
                "data",
                wireLines("myups", [
                  ["ups.status", status],
                  ["battery.charge", "50"],
                  ["battery.runtime", "600"],
                  ["ups.load", "40"],
                ]),
              );
            }, 1);
          }
          return true;
        });

        return mockSocket;
      });

      return nutDefinition.fetchData!({
        host: "192.168.1.100",
        port: "3493",
        upsName: "myups",
      });
    };

    it("maps OL to ok", async () => {
      const result = await runWithStatus("OL");
      expect(result._status).toBe("ok");
    });

    it.each(["OB", "LB", "RB", "DISCHRG", "BYPASS", "OVER"])("maps %s to warn", async (code) => {
      const result = await runWithStatus(code);
      expect(result._status).toBe("warn");
    });

    it("maps unrecognized codes to none/unknown", async () => {
      const result = await runWithStatus("CAL");
      expect(result._status).toBe("none");
    });
  });

  describe("toPayload", () => {
    it("converts data to payload with stats", () => {
      const payload = nutDefinition.toPayload!({
        _status: "ok",
        status: "OL",
        loadPercent: 45,
        batteryCharge: 100,
        runtimeSeconds: 2100,
      });
      expect(payload.stats).toHaveLength(4);
      expect(payload.stats[0].value).toBe("Online");
      expect(payload.stats[0].label).toBe("Status");
      expect(payload.stats[1].value).toBe("45%");
      expect(payload.stats[1].label).toBe("Load");
      expect(payload.stats[2].value).toBe("100%");
      expect(payload.stats[2].label).toBe("Battery Charge");
      expect(payload.stats[3].value).toBe("35m");
      expect(payload.stats[3].label).toBe("Runtime");
    });

    it("shows hours and minutes when runtime is over 60 minutes", () => {
      const payload = nutDefinition.toPayload!({
        _status: "ok",
        status: "OL",
        loadPercent: 45,
        batteryCharge: 100,
        runtimeSeconds: 7500,
      });
      expect(payload.stats[3].value).toBe("2h 5m");
    });

    it("shows hours only when runtime is exactly on the hour", () => {
      const payload = nutDefinition.toPayload!({
        _status: "ok",
        status: "OL",
        loadPercent: 45,
        batteryCharge: 100,
        runtimeSeconds: 7200,
      });
      expect(payload.stats[3].value).toBe("2h");
    });

    it("shows seconds when runtime is under 1 minute", () => {
      const payload = nutDefinition.toPayload!({
        _status: "warn",
        _statusText: "UPS Status: OB LB",
        status: "OB LB",
        loadPercent: 80,
        batteryCharge: 10,
        runtimeSeconds: 30,
      });
      expect(payload.stats[3].value).toBe("30s");
    });

    it("formats multi-code status as comma-separated labels", () => {
      const payload = nutDefinition.toPayload!({
        _status: "warn",
        status: "OB LB",
        loadPercent: 80,
        batteryCharge: 10,
        runtimeSeconds: 30,
      });
      expect(payload.stats[0].value).toBe("On Battery, Low Battery");
    });

    it("falls back to raw code for unrecognized status", () => {
      const payload = nutDefinition.toPayload!({
        _status: "none",
        status: "WEIRD",
        loadPercent: 0,
        batteryCharge: 0,
        runtimeSeconds: 0,
      });
      expect(payload.stats[0].value).toBe("WEIRD");
    });

    it("shows 0m when runtime is zero", () => {
      const payload = nutDefinition.toPayload!({
        _status: "warn",
        status: "OB",
        loadPercent: 80,
        batteryCharge: 10,
        runtimeSeconds: 0,
      });
      expect(payload.stats[3].value).toBe("0m");
    });
  });
});
