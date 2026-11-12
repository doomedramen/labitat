// Synthetic, heterogeneous services: exercise the actual dashboard shape, not repeated CPU tiles.
const app = (label: string, serviceType: string, cachedWidgetData: Record<string, unknown>) => ({
  label,
  serviceType,
  href: `https://${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.test`,
  cachedWidgetData: { _status: "ok", ...cachedWidgetData },
});
const link = (label: string, iconUrl?: string) => ({
  label,
  href: `https://${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.test`,
  iconUrl,
});
export const operatorDesignGroups = [
  {
    name: "Media",
    items: [
      app("Seerr", "seerr", { pending: 0, approved: 155, available: 15, processing: 140 }),
      app("Plex", "plex", { streams: 0, albums: 18, movies: 596, tvShows: 286 }),
      app("Unmanic", "unmanic", {
        _status: "warn",
        _statusText: "Unable to reach service",
        activeWorkers: 0,
        totalWorkers: 1,
        queuedItems: 0,
      }),
      app("Stash", "stash", {
        counts: {
          scene_count: 1490,
          image_count: 205,
          gallery_count: 18,
          performer_count: 1227,
          studio_count: 359,
          tag_count: 42,
        },
      }),
      { ...link("Romm", "romm"), cachedWidgetData: { _status: "error", _statusText: "HTTP 502" } },
      link("Tautulli", "tautulli"),
    ],
  },
  {
    name: "Arr",
    items: [
      app("Radarr", "radarr", { queued: 0, missing: 31, wanted: 107, movies: 629 }),
      app("Sonarr", "sonarr", { queued: 0, missing: 91, wanted: 4474, series: 316 }),
      app("Bazarr", "bazarr", { missingMovies: 0, missingEpisodes: 0 }),
      app("Prowlarr", "prowlarr", { queries: 9964, grabs: 1, indexers: 17 }),
      app("Whisparr", "whisparr", {
        _status: "error",
        _statusText: "Authentication failed (HTTP 401)",
      }),
    ],
  },
  {
    name: "Downloads",
    items: [
      app("SABnzbd", "sabnzbd", {
        speed: "33.2 M",
        remaining: "0:01:15",
        queueSize: 1,
        downloading: true,
      }),
      app("qBittorrent", "qbittorrent", {
        downSpeed: "12.4 MB/s",
        _numeric: {
          down: { value: 13000000, unit: "bytes/s" },
          up: { value: 839680, unit: "bytes/s" },
        },
        upSpeed: "820 KB/s",
        activeDownloads: 2,
        queued: 1,
      }),
    ],
  },
  {
    name: "Home",
    items: [
      app("Bambuddy", "bambuddy", {
        _status: "warn",
        _statusText: "Printer connection unavailable",
      }),
      link("Calibre-Web", "calibre-web"),
      app("Calibre Downloader", "generic-rest", { label: "Queued", value: 0 }),
      link("Home Assistant", "home-assistant"),
      link("TagTeam"),
      link("Norish", "norish"),
    ],
  },
  {
    name: "Infrastructure",
    items: [
      ...["Catacomb", "Catacomb 2", "Catacomb 3"].map((name, index) =>
        app(name, "proxmox", {
          nodes: 1,
          vms: 1,
          runningVMs: 1,
          containers: 11,
          runningContainers: 10 - index,
          cpuUsage: 2.3 + index,
          memoryUsage: 65.1 - index * 5,
        }),
      ),
      app("PBS", "proxmox-backup-server", {
        datastores: 1,
        snapshots: 552,
        usagePercent: 23.5,
        failedTasks: 0,
        cpuUsage: 2.6,
        memoryUsage: 35.1,
      }),
      app("Dockge", "dockge", { containers: 16, running: 14 }),
      link("Nginx Proxy Manager", "nginx-proxy-manager"),
      link("JetKVM"),
      app("PVE UPS", "nut", {
        status: "OL",
        loadPercent: 15,
        batteryCharge: 100,
        runtimeSeconds: 3180,
      }),
      app("Compute", "glances", {
        cpuPercent: 17.3,
        memPercent: 62.8,
        swapPercent: 0,
        load1: 1.24,
        uptime: "12 days",
      }),
    ],
  },
  {
    name: "Network",
    items: [
      app("AdGuard", "adguard", {
        queries: 284315,
        blocked: 38245,
        blockedPercent: 13.5,
        parentalBlocked: 0,
        safeSearchBlocked: 0,
        latency: 8,
      }),
      app("UniFi", "unifi", {
        users: 24,
        guests: 2,
        devices: 8,
        sites: 1,
        lanUsers: 16,
        wlanUsers: 10,
        wanStatus: "up",
      }),
      link("Tailscale", "tailscale"),
      link("Router", "openwrt"),
      link("Cloudflare", "cloudflare"),
      link("Speedtest Tracker", "speedtest-tracker"),
    ],
  },
];
