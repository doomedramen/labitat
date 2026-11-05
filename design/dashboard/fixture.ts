import type { ServiceMetric } from "../../src/lib/service-presentation";
import type { DownloadItemData } from "../../src/components/widgets/download/types";
export type Service = {
  id: string;
  name: string;
  type: string;
  group: string;
  icon: string;
  metrics: ServiceMetric[];
  health: "healthy" | "warning" | "error";
  reason?: string;
  stale?: boolean;
  href: string;
};
export const groupNames = ["Media", "Arr", "Downloads", "Home", "Infrastructure", "Network"];
const rows: [string, string, string, string, string][] = [
  ["Media", "Seerr", "seerr", "seerr", "Approved:155|Pending:0|Available:15|Processing:140"],
  ["Media", "Plex", "plex", "plex", "Streams:3|Albums:18|Movies:596|Shows:286|Bandwidth:24.8 Mb/s"],
  ["Media", "Unmanic", "unmanic", "unmanic", "Active:—|Workers:—|Queued:—"],
  ["Media", "Stash", "stash", "stash", "Scenes:1,490|Performers:1,227|Studios:359"],
  ["Media", "Romm", "romm", "romm", ""],
  ["Media", "Tautulli", "tautulli", "tautulli", ""],
  ["Arr", "Radarr", "radarr", "radarr", "Queued:1|Missing:31|Wanted:107|Movies:629"],
  ["Arr", "Sonarr", "sonarr", "sonarr", "Queued:2|Missing:91|Wanted:4,474|Series:316"],
  ["Arr", "Bazarr", "bazarr", "bazarr", "Missing movies:0|Missing episodes:0"],
  ["Arr", "Prowlarr", "prowlarr", "prowlarr", "Queries:9,964|Grabs:17|Indexers:8"],
  ["Arr", "Whisparr", "whisparr", "whisparr", ""],
  ["Downloads", "SABnzbd", "sabnzbd", "sabnzbd", "Speed:8.2 MB/s|Remaining:4m|Queue:1"],
  [
    "Downloads",
    "qBittorrent",
    "qbittorrent",
    "qbittorrent",
    "Down:12.4 MB/s|Up:820 KB/s|Active:3|Queued:1",
  ],
  ["Home", "Bambuddy", "bambuddy", "bambuddy", "Printers:—|Online:—|Printing:—|Paused:—"],
  ["Home", "Calibre-Web", "calibre-web", "calibre-web", ""],
  ["Home", "Calibre Downloader", "calibre-downloader", "calibre-web", "Active:0|Queued:0"],
  ["Home", "Home Assistant", "homeassistant", "home-assistant", ""],
  ["Home", "TagTeam", "bookmark", "", ""],
  ["Home", "Norish", "norish", "norish", ""],
  ["Infrastructure", "Catacomb", "proxmox", "proxmox", "VMs:1/1|LXCs:10/11|CPU:2.3%|Memory:65.1%"],
  ["Infrastructure", "Catacomb 2", "proxmox", "proxmox", "VMs:0/0|LXCs:6/6|CPU:3.2%|Memory:55.6%"],
  ["Infrastructure", "Catacomb 3", "proxmox", "proxmox", "VMs:0/0|LXCs:7/12|CPU:1.5%|Memory:55.9%"],
  [
    "Infrastructure",
    "PBS",
    "proxmox-backup-server",
    "proxmox",
    "Stores:1|Snapshots:552|CPU:23.5%|Memory:2.6%",
  ],
  ["Infrastructure", "Dockge", "dockge", "dockge", "Containers:16|Running:14"],
  [
    "Infrastructure",
    "Nginx Proxy Manager",
    "nginx-proxy-manager",
    "nginx-proxy-manager",
    "Hosts:32|Certificates:12",
  ],
  ["Infrastructure", "JetKVM", "jetkvm", "jetkvm", ""],
  [
    "Infrastructure",
    "PVE UPS",
    "nut",
    "network-ups-tools",
    "Status:Online|Load:15%|Battery:100%|Runtime:53m",
  ],
  ["Infrastructure", "Compute", "glances", "glances", "CPU:17.3%|RAM:62.8%|Swap:0%|Load:1.2"],
  [
    "Network",
    "AdGuard",
    "adguard",
    "adguard-home",
    "Queries:284.3K|Blocked:38.2K|Rate:13.5%|Parental:0",
  ],
  ["Network", "UniFi", "unifi", "ubiquiti-unifi", "Devices:8|WAN:Up|LAN:16|WLAN:10"],
  ["Network", "Tailscale", "tailscale", "tailscale", ""],
  ["Network", "Router", "router", "openwrt", ""],
  ["Network", "Cloudflare", "cloudflare", "cloudflare", ""],
  [
    "Network",
    "Speedtest Tracker",
    "speedtest-tracker",
    "speedtest-tracker",
    "Down:942 Mb/s|Up:108 Mb/s|Ping:8 ms",
  ],
];
export const services: Service[] = rows.map(([group, name, type, icon, values]) => {
  const id = name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-");
  const reason = (
    {
      unmanic: "Connection timed out",
      romm: "HTTP 502 · Bad gateway",
      whisparr: "Authentication failed",
      bambuddy: "Printer unavailable",
    } as Record<string, string>
  )[id];
  return {
    id,
    name,
    type,
    icon,
    group,
    href: `https://${id}.example.test`,
    health: reason ? (["romm", "whisparr"].includes(id) ? "error" : "warning") : "healthy",
    reason,
    stale: ["unmanic", "bambuddy", "nginx-proxy-manager"].includes(id),
    metrics: values
      ? values.split("|").map((part) => {
          const [label, displayValue] = part.split(":");
          return { id: label.toLowerCase().replaceAll(" ", "-"), label, displayValue };
        })
      : [],
  };
});
export type Activity = DownloadItemData & {
  id: string;
  source: string;
  kind: "download" | "stream";
  viewer?: string;
};
export const activity: Activity[] = [
  {
    id: "d1",
    source: "qbittorrent",
    kind: "download",
    title: "Silo",
    subtitle: "S02E04 · The Harmonium",
    progress: 68,
    speed: "8.1 MB/s",
    timeLeft: "2m 14s",
    activity: "Downloading",
    size: "3.8 GB",
  },
  {
    id: "d2",
    source: "sabnzbd",
    kind: "download",
    title: "Dune: Part Two",
    subtitle: "2160p · Remux",
    progress: 42,
    speed: "8.2 MB/s",
    timeLeft: "4m 08s",
    activity: "Downloading",
    size: "64.2 GB",
  },
  {
    id: "d3",
    source: "qbittorrent",
    kind: "download",
    title: "The Great British Bake Off",
    subtitle: "S15E08 · Dessert Week",
    progress: 91,
    speed: "4.3 MB/s",
    timeLeft: "38s",
    activity: "Downloading",
    size: "1.2 GB",
  },
  {
    id: "d4",
    source: "qbittorrent",
    kind: "download",
    title: "Planet Earth III",
    subtitle: "S01E06 · Extremes",
    activity: "Queued",
    size: "5.1 GB",
  },
  {
    id: "s1",
    source: "plex",
    kind: "stream",
    title: "Interstellar",
    subtitle: "4K HDR · Direct play",
    progress: 46,
    viewer: "Alex · Living room",
    timeLeft: "1:17:42 / 2:49:04",
    activity: "Playing",
  },
  {
    id: "s2",
    source: "plex",
    kind: "stream",
    title: "Severance",
    subtitle: "S02E03 · 1080p",
    progress: 63,
    viewer: "Sam · iPad",
    timeLeft: "28:12 / 44:48",
    activity: "Paused",
  },
  {
    id: "s3",
    source: "plex",
    kind: "stream",
    title: "Blue Planet II",
    subtitle: "S01E01 · 1080p",
    progress: 19,
    viewer: "Jamie · Bedroom",
    timeLeft: "11:02 / 58:00",
    activity: "Playing",
  },
];
