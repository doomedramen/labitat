import type { ServiceDefinition, ServiceRegistry } from "./types"

// Registry of all available service adapters
// Add new imports here when creating new adapters
import { radarrDefinition } from "./radarr"
import { sonarrDefinition } from "./sonarr"
import { prowlarrDefinition } from "./prowlarr"
import { overseerrDefinition } from "./overseerr"
import { sabnzbdDefinition } from "./sabnzbd"
import { qbittorrentDefinition } from "./qbittorrent"
import { adguardDefinition } from "./adguard"
import { bazarrDefinition } from "./bazarr"
import { tautulliDefinition } from "./tautulli"
import { plexDefinition } from "./plex"
import { homeassistantDefinition } from "./homeassistant"
import { unmanicDefinition } from "./unmanic"
import { apcupsDefinition } from "./apcups"
import { unifiDefinition } from "./unifi"
import { lidarrDefinition } from "./lidarr"
import { readarrDefinition } from "./readarr"
import { jellyfinDefinition } from "./jellyfin"
import { embyDefinition } from "./emby"
import { piholeDefinition } from "./pihole"
import { portainerDefinition } from "./portainer"
import { nginxProxyManagerDefinition } from "./nginx-proxy-manager"
import { traefikDefinition } from "./traefik"
import { uptimeKumaDefinition } from "./uptime-kuma"
import { grafanaDefinition } from "./grafana"
import { genericPingDefinition } from "./generic-ping"
import { genericRestDefinition } from "./generic-rest"
import { transmissionDefinition } from "./transmission"
import { immichDefinition } from "./immich"
import { jackettDefinition } from "./jackett"
import { frigateDefinition } from "./frigate"

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
  [overseerrDefinition.id]: overseerrDefinition,
  [sabnzbdDefinition.id]: sabnzbdDefinition,
  [qbittorrentDefinition.id]: qbittorrentDefinition,
  [adguardDefinition.id]: adguardDefinition,
  [bazarrDefinition.id]: bazarrDefinition,
  [tautulliDefinition.id]: tautulliDefinition,
  [plexDefinition.id]: plexDefinition,
  [homeassistantDefinition.id]: homeassistantDefinition,
  [unmanicDefinition.id]: unmanicDefinition,
  [apcupsDefinition.id]: apcupsDefinition,
  [unifiDefinition.id]: unifiDefinition,
  [lidarrDefinition.id]: lidarrDefinition,
  [readarrDefinition.id]: readarrDefinition,
  [jellyfinDefinition.id]: jellyfinDefinition,
  [embyDefinition.id]: embyDefinition,
  [piholeDefinition.id]: piholeDefinition,
  [portainerDefinition.id]: portainerDefinition,
  [nginxProxyManagerDefinition.id]: nginxProxyManagerDefinition,
  [traefikDefinition.id]: traefikDefinition,
  [uptimeKumaDefinition.id]: uptimeKumaDefinition,
  [grafanaDefinition.id]: grafanaDefinition,
  [genericPingDefinition.id]: genericPingDefinition,
  [genericRestDefinition.id]: genericRestDefinition,
  [transmissionDefinition.id]: transmissionDefinition,
  [immichDefinition.id]: immichDefinition,
  [jackettDefinition.id]: jackettDefinition,
  [frigateDefinition.id]: frigateDefinition,
}

/** Get a service definition by ID */
export function getService(id: string): ServiceDefinition | undefined {
  return registry[id]
}

/** Get all available service definitions */
export function getAllServices(): ServiceDefinition[] {
  return Object.values(registry)
}
