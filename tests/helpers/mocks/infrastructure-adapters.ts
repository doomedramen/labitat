/**
 * Mock data for infrastructure and server adapters (Proxmox, Nginx Proxy Manager, Portainer, etc.)
 */

import type { MockResponse } from "../adapter-mocks";
import { successResponse, urlPatterns } from "../adapter-mocks";

// ── Proxmox Mocks ───────────────────────────────────────────────────────────────

export const proxmoxMocks = {
  success: (
    baseUrl = "https://proxmox.example.com",
    opts?: {
      nodes?: number;
      vms?: Array<{
        vmid: number;
        name: string;
        status: "running" | "stopped";
        cpu?: number;
        mem?: number;
        maxmem?: number;
        disk?: number;
        maxdisk?: number;
      }>;
      containers?: Array<{
        vmid: number;
        name: string;
        status: "running" | "stopped";
        cpu?: number;
        mem?: number;
        maxmem?: number;
        disk?: number;
        maxdisk?: number;
      }>;
    },
  ): MockResponse[] => {
    const vms = opts?.vms || [
      {
        vmid: 100,
        name: "web-server",
        status: "running" as const,
        cpu: 0.25,
        mem: 2147483648,
        maxmem: 4294967296,
      },
      {
        vmid: 101,
        name: "db-server",
        status: "running" as const,
        cpu: 0.45,
        mem: 8589934592,
        maxmem: 17179869184,
      },
    ];
    const containers = opts?.containers || [];

    return [
      // Login
      successResponse(urlPatterns.api(baseUrl, "/api2/json/access/ticket"), {
        data: {
          ticket: "test-ticket-12345",
          CSRFPreventionToken: "csrf-token-12345",
        },
      }),
      // Nodes
      successResponse(urlPatterns.api(baseUrl, "/api2/json/nodes"), {
        data: Array.from({ length: opts?.nodes ?? 1 }, (_, i) => ({
          node: `node-${i}`,
          status: "online",
          cpu: 0.35,
          maxcpu: 8,
          mem: 17179869184,
          maxmem: 34359738368,
        })),
      }),
      // QEMU VMs
      successResponse(urlPatterns.api(baseUrl, "/api2/json/cluster/resources"), {
        data: [
          ...vms.map((vm) => ({
            vmid: vm.vmid,
            name: vm.name,
            status: vm.status,
            type: "qemu",
            cpu: vm.cpu ?? 0,
            mem: vm.mem ?? 0,
            maxmem: vm.maxmem ?? 0,
            disk: vm.disk ?? 0,
            maxdisk: vm.maxdisk ?? 0,
          })),
          ...containers.map((ct) => ({
            vmid: ct.vmid,
            name: ct.name,
            status: ct.status,
            type: "lxc",
            cpu: ct.cpu ?? 0,
            mem: ct.mem ?? 0,
            maxmem: ct.maxmem ?? 0,
            disk: ct.disk ?? 0,
            maxdisk: ct.maxdisk ?? 0,
          })),
        ],
      }),
    ];
  },

  empty: (baseUrl = "https://proxmox.example.com"): MockResponse[] => [
    successResponse(urlPatterns.api(baseUrl, "/api2/json/access/ticket"), {
      data: { ticket: "test-ticket", CSRFPreventionToken: "csrf-token" },
    }),
    successResponse(urlPatterns.api(baseUrl, "/api2/json/nodes"), { data: [] }),
    successResponse(urlPatterns.api(baseUrl, "/api2/json/cluster/resources"), {
      data: [],
    }),
  ],

  error: (baseUrl = "https://proxmox.example.com", status = 500): MockResponse =>
    successResponse(
      urlPatterns.api(baseUrl, "/api2/json/access/ticket"),
      { error: `Proxmox error: ${status}` },
      status,
    ),

  unauthorized: (baseUrl = "https://proxmox.example.com"): MockResponse =>
    successResponse(
      urlPatterns.api(baseUrl, "/api2/json/access/ticket"),
      { error: "Authentication failed" },
      401,
    ),
};

// ── Proxmox Backup Server Mocks ─────────────────────────────────────────────────

export const proxmoxBackupServerMocks = {
  success: (
    baseUrl = "https://pbs.example.com",
    opts?: {
      datastores?: number;
      usedBytes?: number;
      totalBytes?: number;
    },
  ): MockResponse[] => [
    successResponse(urlPatterns.api(baseUrl, "/api2/json/access/ticket"), {
      data: {
        ticket: "test-ticket-12345",
        CSRFPreventionToken: "csrf-token-12345",
      },
    }),
    successResponse(urlPatterns.api(baseUrl, "/api2/json/datastores"), {
      data: Array.from({ length: opts?.datastores ?? 2 }, (_, i) => ({
        store: `datastore-${i}`,
        used: opts?.usedBytes ?? 536870912000,
        total: opts?.totalBytes ?? 2199023255552,
      })),
    }),
  ],

  empty: (baseUrl = "https://pbs.example.com"): MockResponse[] => [
    successResponse(urlPatterns.api(baseUrl, "/api2/json/access/ticket"), {
      data: { ticket: "test-ticket", CSRFPreventionToken: "csrf-token" },
    }),
    successResponse(urlPatterns.api(baseUrl, "/api2/json/datastores"), {
      data: [],
    }),
  ],

  error: (baseUrl = "https://pbs.example.com", status = 500): MockResponse =>
    successResponse(
      urlPatterns.api(baseUrl, "/api2/json/access/ticket"),
      { error: `PBS error: ${status}` },
      status,
    ),
};

// ── Nginx Proxy Manager Mocks ───────────────────────────────────────────────────

export const nginxProxyManagerMocks = {
  success: (
    baseUrl = "https://npm.example.com",
    opts?: {
      proxyHosts?: number;
      redirectionHosts?: number;
      streams?: number;
      deadHosts?: number;
    },
  ): MockResponse[] => [
    // Login
    successResponse(urlPatterns.api(baseUrl, "/api/tokens"), {
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test",
      expires: "2026-12-31T23:59:59Z",
    }),
    // Proxy hosts
    successResponse(
      urlPatterns.api(baseUrl, "/api/nginx/proxy-hosts"),
      Array.from({ length: opts?.proxyHosts ?? 5 }, (_, i) => ({
        id: i + 1,
        domain_names: [`service-${i}.example.com`],
        enabled: true,
      })),
    ),
    // Redirection hosts
    successResponse(
      urlPatterns.api(baseUrl, "/api/nginx/redirection-hosts"),
      Array.from({ length: opts?.redirectionHosts ?? 2 }, (_, i) => ({
        id: i + 1,
        domain_names: [`redirect-${i}.example.com`],
        enabled: true,
      })),
    ),
    // Streams
    successResponse(
      urlPatterns.api(baseUrl, "/api/nginx/streams"),
      Array.from({ length: opts?.streams ?? 3 }, (_, i) => ({
        id: i + 1,
        incoming_port: 8000 + i,
        enabled: true,
      })),
    ),
    // Dead hosts
    successResponse(
      urlPatterns.api(baseUrl, "/api/nginx/dead-hosts"),
      Array.from({ length: opts?.deadHosts ?? 1 }, (_, i) => ({
        id: i + 1,
        domain_names: [`dead-${i}.example.com`],
        enabled: false,
      })),
    ),
  ],

  empty: (baseUrl = "https://npm.example.com"): MockResponse[] => [
    successResponse(urlPatterns.api(baseUrl, "/api/tokens"), {
      token: "test-token",
      expires: "2026-12-31T23:59:59Z",
    }),
    successResponse(urlPatterns.api(baseUrl, "/api/nginx/proxy-hosts"), []),
    successResponse(urlPatterns.api(baseUrl, "/api/nginx/redirection-hosts"), []),
    successResponse(urlPatterns.api(baseUrl, "/api/nginx/streams"), []),
    successResponse(urlPatterns.api(baseUrl, "/api/nginx/dead-hosts"), []),
  ],

  error: (baseUrl = "https://npm.example.com", status = 500): MockResponse =>
    successResponse(
      urlPatterns.api(baseUrl, "/api/tokens"),
      { error: `NPM error: ${status}` },
      status,
    ),
};

// ── Portainer Mocks ──────────────────────────────────────────────────────────────

export const portainerMocks = {
  success: (
    baseUrl = "https://portainer.example.com",
    opts?: {
      endpoints?: number;
      stacks?: number;
      containers?: number;
      runningContainers?: number;
    },
  ): MockResponse[] => [
    // Login
    successResponse(urlPatterns.api(baseUrl, "/api/auth"), {
      jwt: "test-jwt-token-12345",
    }),
    // Endpoints
    successResponse(
      urlPatterns.api(baseUrl, "/api/endpoints"),
      Array.from({ length: opts?.endpoints ?? 2 }, (_, i) => ({
        Id: i + 1,
        Name: `endpoint-${i}`,
        Type: 1,
        Status: 1,
      })),
    ),
    // Stacks
    successResponse(
      urlPatterns.api(baseUrl, "/api/stacks"),
      Array.from({ length: opts?.stacks ?? 3 }, (_, i) => ({
        Id: i + 1,
        Name: `stack-${i}`,
        Status: 1,
      })),
    ),
    // Containers
    successResponse(
      urlPatterns.api(baseUrl, "/api/endpoints/1/docker/containers/json"),
      Array.from({ length: opts?.containers ?? 10 }, (_, i) => ({
        Id: `container-${i}`,
        Names: [`/container-${i}`],
        State: i < (opts?.runningContainers ?? 8) ? "running" : "exited",
        Status: i < (opts?.runningContainers ?? 8) ? "Up 5 days" : "Exited (0) 2 days ago",
      })),
    ),
  ],

  empty: (baseUrl = "https://portainer.example.com"): MockResponse[] => [
    successResponse(urlPatterns.api(baseUrl, "/api/auth"), {
      jwt: "test-token",
    }),
    successResponse(urlPatterns.api(baseUrl, "/api/endpoints"), []),
    successResponse(urlPatterns.api(baseUrl, "/api/stacks"), []),
    successResponse(urlPatterns.api(baseUrl, "/api/endpoints/1/docker/containers/json"), []),
  ],

  error: (baseUrl = "https://portainer.example.com", status = 500): MockResponse =>
    successResponse(
      urlPatterns.api(baseUrl, "/api/auth"),
      { error: `Portainer error: ${status}` },
      status,
    ),
};

// ── Traefik Mocks ───────────────────────────────────────────────────────────────

export const traefikMocks = {
  success: (
    baseUrl = "https://traefik.example.com",
    opts?: {
      routers?: number;
      services?: number;
      middlewares?: number;
    },
  ): MockResponse[] => [
    successResponse(urlPatterns.api(baseUrl, "/api/rawdata"), {
      routers: Array.from({ length: opts?.routers ?? 8 }, (_, i) => ({
        entryPoints: ["web", "websecure"],
        service: `service-${i}`,
        rule: `Host(\`service-${i}.example.com\`)`,
        status: "enabled",
      })),
      services: Array.from({ length: opts?.services ?? 8 }, (_, i) => ({
        serverStatus: {
          [`server-${i}`]: "UP",
        },
      })),
      middlewares: Array.from({ length: opts?.middlewares ?? 3 }, (_, i) => ({
        name: `middleware-${i}`,
        type: "headers",
      })),
    }),
  ],

  empty: (baseUrl = "https://traefik.example.com"): MockResponse[] => [
    successResponse(urlPatterns.api(baseUrl, "/api/rawdata"), {
      routers: {},
      services: {},
      middlewares: {},
    }),
  ],

  error: (baseUrl = "https://traefik.example.com", status = 500): MockResponse =>
    successResponse(
      urlPatterns.api(baseUrl, "/api/rawdata"),
      { error: `Traefik error: ${status}` },
      status,
    ),
};

// ── Seerr (Overseerr) Mocks ─────────────────────────────────────────────────────

export const seerrMocks = {
  success: (
    baseUrl = "https://seerr.example.com",
    opts?: {
      pendingRequests?: number;
      approvedRequests?: number;
      availableRequests?: number;
      totalRequests?: number;
    },
  ): MockResponse[] => [
    successResponse(urlPatterns.api(baseUrl, "/api/v1/request"), {
      pageInfo: {
        results: opts?.totalRequests ?? 25,
      },
      results: Array.from({ length: opts?.pendingRequests ?? 5 }, (_, i) => ({
        id: i + 1,
        status: i < 2 ? 1 : i < 4 ? 2 : 3, // pending, approved, available
        media: {
          status: "available",
        },
      })),
    }),
    successResponse(urlPatterns.api(baseUrl, "/api/v1/service/plex"), {
      id: 1,
      name: "Plex",
      enabled: true,
    }),
  ],

  empty: (baseUrl = "https://seerr.example.com"): MockResponse[] => [
    successResponse(urlPatterns.api(baseUrl, "/api/v1/request"), {
      pageInfo: { results: 0 },
      results: [],
    }),
    successResponse(urlPatterns.api(baseUrl, "/api/v1/service/plex"), {
      id: 1,
      name: "Plex",
      enabled: true,
    }),
  ],

  error: (baseUrl = "https://seerr.example.com", status = 500): MockResponse =>
    successResponse(
      urlPatterns.api(baseUrl, "/api/v1/request"),
      { error: `Seerr error: ${status}` },
      status,
    ),
};

// ── Calibre-Web Mocks ───────────────────────────────────────────────────────────

export const calibreWebMocks = {
  success: (
    baseUrl = "https://calibre-web.example.com",
    opts?: {
      books?: number;
      authors?: number;
      series?: number;
    },
  ): MockResponse[] => [
    successResponse(urlPatterns.api(baseUrl, "/admin"), "<html><body></body></html>", 200, {
      "Content-Type": "text/html",
    }),
    successResponse(urlPatterns.api(baseUrl, "/stats"), {
      books: opts?.books ?? 1234,
      authors: opts?.authors ?? 456,
      series: opts?.series ?? 78,
    }),
  ],

  empty: (baseUrl = "https://calibre-web.example.com"): MockResponse[] => [
    successResponse(urlPatterns.api(baseUrl, "/admin"), "<html><body></body></html>", 200, {
      "Content-Type": "text/html",
    }),
    successResponse(urlPatterns.api(baseUrl, "/stats"), {
      books: 0,
      authors: 0,
      series: 0,
    }),
  ],

  error: (baseUrl = "https://calibre-web.example.com", status = 500): MockResponse =>
    successResponse(
      urlPatterns.api(baseUrl, "/admin"),
      { error: `Calibre-Web error: ${status}` },
      status,
    ),
};

// ── Unmanic Mocks ───────────────────────────────────────────────────────────────

export const unmanicMocks = {
  success: (
    baseUrl = "https://unmanic.example.com",
    opts?: {
      activeTasks?: number;
      completedTasks?: number;
      workerCount?: number;
      queueLength?: number;
    },
  ): MockResponse[] => [
    successResponse(urlPatterns.api(baseUrl, "/unmanic/api/v1/status"), {
      active: opts?.activeTasks ?? 2,
      completed: opts?.completedTasks ?? 150,
      workers: opts?.workerCount ?? 4,
      queue: {
        count: opts?.queueLength ?? 5,
      },
    }),
    successResponse(urlPatterns.api(baseUrl, "/unmanic/api/v1/workers"), {
      workers: Array.from({ length: opts?.workerCount ?? 4 }, (_, i) => ({
        id: i,
        status: i < (opts?.activeTasks ?? 2) ? "busy" : "idle",
      })),
    }),
  ],

  empty: (baseUrl = "https://unmanic.example.com"): MockResponse[] => [
    successResponse(urlPatterns.api(baseUrl, "/unmanic/api/v1/status"), {
      active: 0,
      completed: 0,
      workers: 0,
      queue: { count: 0 },
    }),
    successResponse(urlPatterns.api(baseUrl, "/unmanic/api/v1/workers"), {
      workers: [],
    }),
  ],

  error: (baseUrl = "https://unmanic.example.com", status = 500): MockResponse =>
    successResponse(
      urlPatterns.api(baseUrl, "/unmanic/api/v1/status"),
      { error: `Unmanic error: ${status}` },
      status,
    ),
};
