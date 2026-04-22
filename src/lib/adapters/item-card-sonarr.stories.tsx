import type { Meta, StoryObj } from "@storybook/react";
import { ItemCard } from "@/components/dashboard/item/item-card";
import type { ServiceData, ServiceStatus } from "./types";

const mockSonarrData: ServiceData = {
  _status: "ok",
  queued: 8,
  missing: 3,
  wanted: 1,
  series: 89,
  showActiveDownloads: true,
  enableQueue: true,
  downloads: [
    {
      title: "S01E05 - The Gathering Storm",
      subtitle: "Game of Thrones",
      progress: 60,
      timeLeft: "30m",
      activity: "Downloading",
      size: "1.2 GB",
    },
    {
      title: "S02E12 - Final Victory",
      subtitle: "Breaking Bad",
      progress: 95,
      timeLeft: "5m",
      activity: "Downloading",
      size: "800 MB",
    },
  ],
};

type ItemRow = {
  id: string;
  groupId: string;
  label: string;
  href: string | null;
  iconUrl: string | null;
  serviceType: string | null;
  serviceUrl: string | null;
  configEnc: string | null;
  order: number;
  pollingMs: number;
  cleanMode: boolean;
  displayMode: string;
  statDisplayMode: string;
  statCardOrder: string | null;
  createdAt: string;
};

type ItemWithCache = ItemRow & {
  cachedWidgetData: ServiceData | null;
  cachedPingStatus: ServiceStatus | null;
};

const baseItem: ItemWithCache = {
  id: "sonarr-1",
  groupId: "group-1",
  label: "Sonarr",
  href: "https://sonarr.example.org",
  iconUrl: null,
  serviceType: "sonarr",
  serviceUrl: "https://sonarr.example.org",
  configEnc: null,
  order: 0,
  pollingMs: 10_000,
  cleanMode: false,
  displayMode: "label",
  statDisplayMode: "label",
  statCardOrder: null,
  createdAt: "2024-01-01T00:00:00Z",
  cachedWidgetData: mockSonarrData,
  cachedPingStatus: null,
};

const meta: Meta<typeof ItemCard> = {
  title: "Dashboard/ItemCard/Sonarr",
  component: ItemCard,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div style={{ width: "355px" }}>
        <Story />
      </div>
    ),
  ],
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ItemCard>;

export const Default: Story = {
  args: {
    item: baseItem,
    editMode: false,
  },
};

export const WithDownloads: Story = {
  args: {
    item: {
      ...baseItem,
      cachedWidgetData: {
        ...mockSonarrData,
        downloads: mockSonarrData.downloads,
      },
    },
    editMode: false,
  },
};

export const CleanMode: Story = {
  args: {
    item: {
      ...baseItem,
      cleanMode: true,
    },
    editMode: false,
  },
};

export const EditMode: Story = {
  args: {
    item: baseItem,
    editMode: true,
  },
};

export const ErrorState: Story = {
  args: {
    item: {
      ...baseItem,
      cachedWidgetData: {
        _status: "error",
        _statusText: "Failed to connect",
        queued: 0,
        missing: 0,
        wanted: 0,
        series: 0,
      },
    },
    editMode: false,
  },
};

export const Loading: Story = {
  args: {
    item: {
      ...baseItem,
      cachedWidgetData: null,
    },
    editMode: false,
  },
};
