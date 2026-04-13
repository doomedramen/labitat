import type { ServiceDefinition, ServiceRegistry } from "./types";

// ── Active adapters (manually tested) ─────────────────────────────────────────
import { radarrDefinition } from "./radarr";
import { sonarrDefinition } from "./sonarr";
import { prowlarrDefinition } from "./prowlarr";
import { seerrDefinition } from "./seerr";
import { sabnzbdDefinition } from "./sabnzbd";
import { qbittorrentDefinition } from "./qbittorrent";
import { adguardDefinition } from "./adguard";
import { bazarrDefinition } from "./bazarr";
import { tautulliDefinition } from "./tautulli";
import { plexDefinition } from "./plex";
import { unmanicDefinition } from "./unmanic";
import { apcupsDefinition } from "./apcups";
import { unifiDefinition } from "./unifi";
import { nginxProxyManagerDefinition } from "./nginx-proxy-manager";
import { proxmoxDefinition } from "./proxmox";
import { proxmoxBackupServerDefinition } from "./proxmox-backup-server";
import { calibreWebDefinition } from "./calibre-web";

// ── General widgets ──────────────────────────────────────────────────────────
import { openmeteoDefinition } from "./openmeteo";
import { datetimeDefinition } from "./datetime";
import { glancesDefinition } from "./glances";
import { glancesTimeseriesDefinition } from "./glances-timeseries";
import { GlancesTimeseriesWidget } from "@/components/widgets/glances-timeseries-widget";
import { glancesPerCpuDefinition } from "./glances-percpu";
import { glancesProcessesDefinition } from "./glances-processes";
import { GlancesProcessesWidget } from "@/components/widgets/glances-processes-widget";
import { glancesSensorsDefinition } from "./glances-sensors";
import { glancesDiskUsageDefinition } from "./glances-diskusage";
import { openweathermapDefinition } from "./openweathermap";
import { searchDefinition } from "./search";
import { matrixDefinition } from "./matrix";
import { pipesDefinition } from "./pipes";

// ── Disabled adapters (available but not manually tested) ────────────────────
import { embyDefinition } from "./emby";
import { jellyfinDefinition } from "./jellyfin";
import { lidarrDefinition } from "./lidarr";
import { readarrDefinition } from "./readarr";
import { piholeDefinition } from "./pihole";
import { portainerDefinition } from "./portainer";
import { traefikDefinition } from "./traefik";
import { uptimeKumaDefinition } from "./uptime-kuma";
import { grafanaDefinition } from "./grafana";
import { genericPingDefinition } from "./generic-ping";
import { genericRestDefinition } from "./generic-rest";
import { transmissionDefinition } from "./transmission";
import { immichDefinition } from "./immich";
import { jackettDefinition } from "./jackett";
import { frigateDefinition } from "./frigate";
import { homeassistantDefinition } from "./homeassistant";

// Re-export types
export type {
  ServiceDefinition,
  ServiceData,
  FieldDef,
  FieldType,
  ServiceCategory,
  ServiceRegistry,
} from "./types";

/**
 * Build the service registry from an array of service definitions.
 *
 * TypeScript's contravariance for function types prevents assigning
 * ServiceDefinition<TData> to ServiceDefinition<ServiceData> because
 * FC<TData> is contravariant in TData. However, this is safe because:
 * - fetchData() returns TData (covariant - safe)
 * - Widget is called with TData from fetchData (contravariant but safe in practice)
 *
 * Type safety is enforced at each adapter's definition site where
 * Widget: FC<TData> must match the TData returned by fetchData().
 *
 * Runtime validation catches missing id/name/fetchData fields.
 */
function buildRegistry(definitions: unknown[]): ServiceRegistry {
  const registry: Record<string, ServiceDefinition> = {};
  for (const def of definitions as ServiceDefinition[]) {
    if (def?.id) registry[def.id] = def;
  }
  return registry as ServiceRegistry;
}

// Override renderWidget for adapters that need client-side widgets.
// Using spread + override avoids mutating the imported definitions.
const glancesTimeseriesWithWidget: typeof glancesTimeseriesDefinition = {
  ...glancesTimeseriesDefinition,
  renderWidget: GlancesTimeseriesWidget,
};
const glancesProcessesWithWidget: typeof glancesProcessesDefinition = {
  ...glancesProcessesDefinition,
  renderWidget: GlancesProcessesWidget,
};

export const registry = buildRegistry([
  // Active adapters (manually tested)
  radarrDefinition,
  sonarrDefinition,
  prowlarrDefinition,
  seerrDefinition,
  sabnzbdDefinition,
  qbittorrentDefinition,
  adguardDefinition,
  bazarrDefinition,
  tautulliDefinition,
  plexDefinition,
  unmanicDefinition,
  apcupsDefinition,
  unifiDefinition,
  nginxProxyManagerDefinition,
  proxmoxDefinition,
  proxmoxBackupServerDefinition,
  calibreWebDefinition,

  // General widgets
  openmeteoDefinition,
  datetimeDefinition,
  glancesDefinition,
  glancesTimeseriesWithWidget,
  glancesPerCpuDefinition,
  glancesProcessesWithWidget,
  glancesSensorsDefinition,
  glancesDiskUsageDefinition,
  openweathermapDefinition,
  searchDefinition,
  matrixDefinition,
  pipesDefinition,

  // Disabled adapters (not manually tested)
  embyDefinition,
  jellyfinDefinition,
  lidarrDefinition,
  readarrDefinition,
  piholeDefinition,
  portainerDefinition,
  traefikDefinition,
  uptimeKumaDefinition,
  grafanaDefinition,
  genericPingDefinition,
  genericRestDefinition,
  transmissionDefinition,
  immichDefinition,
  jackettDefinition,
  frigateDefinition,
  homeassistantDefinition,
]);

/** Get a service definition by ID */
export function getService(id: string): ServiceDefinition | undefined {
  return registry[id];
}

/** Get all available service definitions */
export function getAllServices(): ServiceDefinition[] {
  return Object.values(registry);
}
