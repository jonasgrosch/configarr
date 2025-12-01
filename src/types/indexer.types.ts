import type {
  Field as LidarrIndexerField,
  IndexerResource as LidarrIndexerResource,
  TagResource as LidarrTagResource,
} from "../__generated__/lidarr/data-contracts";
import type {
  Field as RadarrIndexerField,
  IndexerResource as RadarrIndexerResource,
  TagResource as RadarrTagResource,
} from "../__generated__/radarr/data-contracts";
import type {
  Field as ReadarrIndexerField,
  IndexerResource as ReadarrIndexerResource,
  TagResource as ReadarrTagResource,
} from "../__generated__/readarr/data-contracts";
import type {
  Field as SonarrIndexerField,
  IndexerResource as SonarrIndexerResource,
  TagResource as SonarrTagResource,
} from "../__generated__/sonarr/data-contracts";
import type {
  Field as WhisparrIndexerField,
  IndexerResource as WhisparrIndexerResource,
  TagResource as WhisparrTagResource,
} from "../__generated__/whisparr/data-contracts";

export type IndexerResource =
  | LidarrIndexerResource
  | RadarrIndexerResource
  | ReadarrIndexerResource
  | SonarrIndexerResource
  | WhisparrIndexerResource;

export type IndexerField =
  | LidarrIndexerField
  | RadarrIndexerField
  | ReadarrIndexerField
  | SonarrIndexerField
  | WhisparrIndexerField;

export type IndexerTagResource =
  | LidarrTagResource
  | RadarrTagResource
  | ReadarrTagResource
  | SonarrTagResource
  | WhisparrTagResource;
