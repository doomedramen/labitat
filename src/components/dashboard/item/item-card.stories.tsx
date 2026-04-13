import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ItemCard } from "./item-card";
import type { ItemWithCache } from "@/lib/types";

const meta: Meta<typeof ItemCard> = {
  title: "Dashboard/ItemCard",
  component: ItemCard,
  parameters: {
    layout: "centered",
    test: { disable: true },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[300px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof ItemCard>;

const baseItem: ItemWithCache = {
  id: "test-item",
  groupId: "test-group",
  label: "Test Service",
  href: "https://example.com",
  iconUrl: null,
  serviceType: null,
  serviceUrl: null,
  configEnc: null,
  order: 0,
  pollingMs: 30000,
  cleanMode: false,
  displayMode: "label",
  statDisplayMode: "label",
  statCardOrder: null,
  createdAt: new Date().toISOString(),
  cachedWidgetData: null,
  cachedPingStatus: { state: "reachable" },
};

export const Website: Story = {
  args: {
    item: {
      ...baseItem,
      label: "Google",
      href: "https://google.com",
      iconUrl: "https://www.google.com/favicon.ico",
    },
    editMode: false,
  },
};

export const Sonarr: Story = {
  args: {
    item: {
      ...baseItem,
      label: "Sonarr",
      serviceType: "sonarr",
      href: "http://localhost:8989",
      cachedWidgetData: {
        _status: "ok",
        queued: 2,
        missing: 5,
        wanted: 10,
        series: 45,
        downloads: [
          {
            title: "The Bear - S03E01",
            progress: 45.5,
            timeLeft: "5m",
            activity: "Downloading",
          },
        ],
      },
    },
    editMode: false,
  },
};

export const Plex: Story = {
  args: {
    item: {
      ...baseItem,
      label: "Plex",
      serviceType: "plex",
      href: "http://localhost:32400",
      cachedWidgetData: {
        _status: "ok",
        sessions: [
          {
            title: "Dune: Part Two",
            user: "Martin",
            progress: 3600,
            duration: 9900,
            state: "playing",
            transcoding: { isDirect: true },
          },
        ],
      },
    },
    editMode: false,
  },
};

export const Proxmox: Story = {
  args: {
    item: {
      ...baseItem,
      label: "Proxmox node-01",
      serviceType: "proxmox",
      href: "https://localhost:8006",
      cachedWidgetData: {
        _status: "ok",
        cpu: 12.5,
        memory: 65,
        memory_total: "64.0 GB",
        memory_free: "22.4 GB",
        uptime: "12d 4h",
      },
    },
    editMode: false,
  },
};

export const Offline: Story = {
  args: {
    item: {
      ...baseItem,
      label: "Offline Service",
      cachedPingStatus: { state: "unreachable", reason: "Connection refused" },
    },
    editMode: false,
  },
};

export const EditMode: Story = {
  args: {
    item: {
      ...baseItem,
      label: "Sonarr",
      serviceType: "sonarr",
    },
    editMode: true,
  },
};
