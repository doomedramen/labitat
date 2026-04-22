import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";

vi.mock("net", () => ({
  createConnection: vi.fn(),
}));

import { apcupsDefinition } from "@/lib/adapters/apcups";
import * as net from "net";

describe("apcups definition", () => {
  it("has correct metadata", () => {
    expect(apcupsDefinition.id).toBe("apcups");
    expect(apcupsDefinition.name).toBe("APC UPS");
    expect(apcupsDefinition.icon).toBe("apc");
    expect(apcupsDefinition.category).toBe("monitoring");
    expect(apcupsDefinition.defaultPollingMs).toBe(15_000);
  });

  it("has configFields defined", () => {
    expect(apcupsDefinition.configFields).toBeDefined();
    expect(apcupsDefinition.configFields).toHaveLength(4);
    expect(apcupsDefinition.configFields[0].key).toBe("connectionType");
    expect(apcupsDefinition.configFields[0].type).toBe("select");
    expect(apcupsDefinition.configFields[1].key).toBe("host");
    expect(apcupsDefinition.configFields[1].type).toBe("text");
    expect(apcupsDefinition.configFields[2].key).toBe("port");
    expect(apcupsDefinition.configFields[2].type).toBe("number");
    expect(apcupsDefinition.configFields[3].key).toBe("url");
    expect(apcupsDefinition.configFields[3].type).toBe("url");
  });

  describe("fetchData", () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("fetches data successfully via TCP", async () => {
      const mockTcpData = `APC      : 001,034,0871
DATE     : 2024-01-15 10:30:00 +0000
HOSTNAME : server
VERSION  : 3.14.14 (31 May 2016) redhat
UPSNAME  : myups
LOADPCT  : 45.2 Percent
BCHARGE  : 100.0 Percent
TIMELEFT : 35.0 Minutes
ITEMP    : 32.5 C
STATUS   : ONLINE
`;

      const mockSocket = new EventEmitter() as net.Socket & {
        write: ReturnType<typeof vi.fn>;
        destroy: ReturnType<typeof vi.fn>;
        end: ReturnType<typeof vi.fn>;
      };
      mockSocket.write = vi.fn() as typeof mockSocket.write;
      mockSocket.destroy = vi.fn() as typeof mockSocket.destroy;
      mockSocket.end = vi.fn() as typeof mockSocket.end;

      vi.mocked(net.createConnection).mockImplementation((_options, callback) => {
        // Simulate connection established
        setTimeout(() => callback?.(), 0);

        // Simulate data received in NIS format (2-byte length + payload)
        const payload = Buffer.from(mockTcpData);
        const packet = Buffer.alloc(2 + payload.length);
        packet.writeUInt16BE(payload.length, 0);
        payload.copy(packet, 2);

        const endMarker = Buffer.alloc(2);
        endMarker.writeUInt16BE(0, 0);

        setTimeout(() => {
          mockSocket.emit("data", packet);
          mockSocket.emit("data", endMarker);
          mockSocket.emit("end");
        }, 5);

        return mockSocket;
      });

      const result = await apcupsDefinition.fetchData!({
        connectionType: "tcp",
        host: "192.168.1.100",
        port: "3551",
      });

      expect(result._status).toBe("ok");
      expect(result.loadPercent).toBe(45.2);
      expect(result.batteryCharge).toBe(100);
      expect(result.timeLeft).toBe(35);
      expect(result.temperature).toBe(32.5);
      expect(result.status).toBe("ONLINE");
    });

    it("throws error when TCP connection fails", async () => {
      const mockSocket = new EventEmitter() as net.Socket & {
        write: ReturnType<typeof vi.fn>;
        destroy: ReturnType<typeof vi.fn>;
        end: ReturnType<typeof vi.fn>;
      };
      mockSocket.write = vi.fn() as typeof mockSocket.write;
      mockSocket.destroy = vi.fn() as typeof mockSocket.destroy;
      mockSocket.end = vi.fn() as typeof mockSocket.end;

      vi.mocked(net.createConnection).mockImplementation(() => {
        // Simulate connection error
        setTimeout(() => mockSocket.emit("error", new Error("Connection refused")), 5);
        return mockSocket;
      });

      await expect(
        apcupsDefinition.fetchData!({
          connectionType: "tcp",
          host: "192.168.1.100",
          port: "3551",
        }),
      ).rejects.toThrow("TCP connection to 192.168.1.100:3551 failed");
    });

    it("fetches data successfully from HTTP CGI", async () => {
      const mockHtml = `
        <table>
          <tr><td>LOADPCT : <span>45.2 Percent</span></td></tr>
          <tr><td>BCHARGE : <span>100.0 Percent</span></td></tr>
          <tr><td>TIMELEFT : <span>35.0 Minutes</span></td></tr>
          <tr><td>ITEMP : <span>32.5 C</span></td></tr>
          <tr><td>STATUS : <span>ONLINE</span></td></tr>
        </table>
      `;
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockHtml),
        }),
      );

      const result = await apcupsDefinition.fetchData!({
        connectionType: "http",
        url: "https://apcups.example.com/",
      });

      expect(result._status).toBe("ok");
      expect(result.loadPercent).toBe(45.2);
      expect(result.batteryCharge).toBe(100);
      expect(result.timeLeft).toBe(35);
      expect(result.temperature).toBe(32.5);
      expect(result.status).toBe("ONLINE");
    });

    it("sets warn status when not ONLINE", async () => {
      const mockHtml = `
        <table>
          <tr><td>STATUS : <span>ONBATT</span></td></tr>
          <tr><td>LOADPCT : <span>0 Percent</span></td></tr>
          <tr><td>BCHARGE : <span>50 Percent</span></td></tr>
          <tr><td>TIMELEFT : <span>10 Minutes</span></td></tr>
          <tr><td>ITEMP : <span>30 C</span></td></tr>
        </table>
      `;
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockHtml),
        }),
      );

      const result = await apcupsDefinition.fetchData!({
        connectionType: "http",
        url: "https://apcups.example.com",
      });

      expect(result._status).toBe("warn");
      expect(result.status).toBe("ONBATT");
    });

    it("throws on error response", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 404 }));

      await expect(
        apcupsDefinition.fetchData!({
          connectionType: "http",
          url: "https://apcups.example.com",
        }),
      ).rejects.toThrow("APC UPS error: 404");
    });

    it("handles missing values with defaults", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve("<html></html>"),
        }),
      );

      const result = await apcupsDefinition.fetchData!({
        connectionType: "http",
        url: "https://apcups.example.com",
      });

      expect(result.loadPercent).toBe(0);
      expect(result.batteryCharge).toBe(0);
      expect(result.timeLeft).toBe(0);
      expect(result.temperature).toBe(0);
      expect(result.status).toBe("Unknown");
    });
  });

  describe("toPayload", () => {
    it("converts data to payload with stats", () => {
      const payload = apcupsDefinition.toPayload!({
        _status: "ok",
        loadPercent: 45,
        batteryCharge: 100,
        timeLeft: 35,
        temperature: 32,
        status: "ONLINE",
      });
      expect(payload.stats).toHaveLength(4);
      expect(payload.stats[0].value).toBe("45%");
      expect(payload.stats[0].label).toBe("Load");
      expect(payload.stats[1].value).toBe("100%");
      expect(payload.stats[1].label).toBe("Battery");
      expect(payload.stats[2].value).toBe("35m");
      expect(payload.stats[2].label).toBe("Time");
      expect(payload.stats[3].value).toBe("32°C");
      expect(payload.stats[3].label).toBe("Temp");
    });

    it("shows hours and minutes when time left is over 60 minutes", () => {
      const payload = apcupsDefinition.toPayload!({
        _status: "ok",
        loadPercent: 45,
        batteryCharge: 100,
        timeLeft: 125,
        temperature: 32,
        status: "ONLINE",
      });
      expect(payload.stats[2].value).toBe("2h 5m");
    });

    it("shows hours only when time left is exactly on the hour", () => {
      const payload = apcupsDefinition.toPayload!({
        _status: "ok",
        loadPercent: 45,
        batteryCharge: 100,
        timeLeft: 120,
        temperature: 32,
        status: "ONLINE",
      });
      expect(payload.stats[2].value).toBe("2h");
    });

    it("shows seconds when time left is under 1 minute", () => {
      const payload = apcupsDefinition.toPayload!({
        _status: "warn",
        _statusText: "UPS Status: ONBATT",
        loadPercent: 80,
        batteryCharge: 10,
        timeLeft: 0.5,
        temperature: 35,
        status: "ONBATT",
      });
      expect(payload.stats[2].value).toBe("30s");
    });

    it("shows 0m when time left is zero", () => {
      const payload = apcupsDefinition.toPayload!({
        _status: "warn",
        loadPercent: 80,
        batteryCharge: 10,
        timeLeft: 0,
        temperature: 35,
        status: "ONBATT",
      });
      expect(payload.stats[2].value).toBe("0m");
    });
  });
});
