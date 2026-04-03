import type { ServiceDefinition, ServiceRegistry } from "./types"

// Registry of all available service adapters
// Add new imports here when creating new adapters

// ── Active widgets (manually tested) ─────────────────────────────────────────
import { radarrDefinition } from "./radarr"
import { sonarrDefinition } from "./sonarr"
import { prowlarrDefinition } from "./prowlarr"
import { seerrDefinition } from "./seerr"
import { sabnzbdDefinition } from "./sabnzbd"
import { qbittorrentDefinition } from "./qbittorrent"
import { adguardDefinition } from "./adguard"
import { bazarrDefinition } from "./bazarr"
import { tautulliDefinition } from "./tautulli"
import { plexDefinition } from "./plex"
import { unmanicDefinition } from "./unmanic"
import { apcupsDefinition } from "./apcups"
import { unifiDefinition } from "./unifi"
import { nginxProxyManagerDefinition } from "./nginx-proxy-manager"

// ── General widgets ──────────────────────────────────────────────────────────
import { openmeteoDefinition } from "./openmeteo"
import { datetimeDefinition } from "./datetime"
import { glancesDefinition } from "./glances"
import { logoDefinition } from "./logo"
import { openweathermapDefinition } from "./openweathermap"
import { searchDefinition } from "./search"

// ── Disabled widgets (not manually tested) ───────────────────────────────────
// import { embyDefinition } from "./emby"
// import { jellyfinDefinition } from "./jellyfin"
// import { lidarrDefinition } from "./lidarr"
// import { readarrDefinition } from "./readarr"
// import { piholeDefinition } from "./pihole"
// import { portainerDefinition } from "./portainer"
// import { traefikDefinition } from "./traefik"
// import { uptimeKumaDefinition } from "./uptime-kuma"
// import { grafanaDefinition } from "./grafana"
// import { genericPingDefinition } from "./generic-ping"
// import { genericRestDefinition } from "./generic-rest"
// import { transmissionDefinition } from "./transmission"
// import { immichDefinition } from "./immich"
// import { jackettDefinition } from "./jackett"
// import { frigateDefinition } from "./frigate"
// import { homeassistantDefinition } from "./homeassistant"

// Re-export types
export type {
  ServiceDefinition,
  ServiceData,
  FieldDef,
  FieldType,
  ServiceCategory,
  ServiceRegistry,
} from "./types"

export const registry: ServiceRegistry = {
  [radarrDefinition.id]: radarrDefinition,
  [sonarrDefinition.id]: sonarrDefinition,
  [prowlarrDefinition.id]: prowlarrDefinition,
  [seerrDefinition.id]: seerrDefinition,
  [sabnzbdDefinition.id]: sabnzbdDefinition,
  [qbittorrentDefinition.id]: qbittorrentDefinition,
  [adguardDefinition.id]: adguardDefinition,
  [bazarrDefinition.id]: bazarrDefinition,
  [tautulliDefinition.id]: tautulliDefinition,
  [plexDefinition.id]: plexDefinition,
  [unmanicDefinition.id]: unmanicDefinition,
  [apcupsDefinition.id]: apcupsDefinition,
  [unifiDefinition.id]: unifiDefinition,
  [nginxProxyManagerDefinition.id]: nginxProxyManagerDefinition,

  // General widgets
  [openmeteoDefinition.id]: openmeteoDefinition,
  [datetimeDefinition.id]: datetimeDefinition,
  [glancesDefinition.id]: glancesDefinition,
  [logoDefinition.id]: logoDefinition,
  [openweathermapDefinition.id]: openweathermapDefinition,
  [searchDefinition.id]: searchDefinition,

  // Disabled widgets
  // [embyDefinition.id]: embyDefinition,
  // [jellyfinDefinition.id]: jellyfinDefinition,
  // [lidarrDefinition.id]: lidarrDefinition,
  // [readarrDefinition.id]: readarrDefinition,
  // [piholeDefinition.id]: piholeDefinition,
  // [portainerDefinition.id]: portainerDefinition,
  // [traefikDefinition.id]: traefikDefinition,
  // [uptimeKumaDefinition.id]: uptimeKumaDefinition,
  // [grafanaDefinition.id]: grafanaDefinition,
  // [genericPingDefinition.id]: genericPingDefinition,
  // [genericRestDefinition.id]: genericRestDefinition,
  // [transmissionDefinition.id]: transmissionDefinition,
  // [immichDefinition.id]: immichDefinition,
  // [jackettDefinition.id]: jackettDefinition,
  // [frigateDefinition.id]: frigateDefinition,
  // [homeassistantDefinition.id]: homeassistantDefinition,
}

/** Get a service definition by ID */
export function getService(id: string): ServiceDefinition | undefined {
  return registry[id]
}

/** Get all available service definitions */
export function getAllServices(): ServiceDefinition[] {
  return Object.values(registry)
}
