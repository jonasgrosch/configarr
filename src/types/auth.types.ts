import type { HostConfigResource as LidarrHostConfigResource } from "../__generated__/lidarr/data-contracts";
import type { HostConfigResource as RadarrHostConfigResource } from "../__generated__/radarr/data-contracts";
import type { HostConfigResource as ReadarrHostConfigResource } from "../__generated__/readarr/data-contracts";
import type { HostConfigResource as SonarrHostConfigResource } from "../__generated__/sonarr/data-contracts";
import type { HostConfigResource as WhisparrHostConfigResource } from "../__generated__/whisparr/data-contracts";

export type HostConfigResource =
  | LidarrHostConfigResource
  | RadarrHostConfigResource
  | ReadarrHostConfigResource
  | SonarrHostConfigResource
  | WhisparrHostConfigResource;
