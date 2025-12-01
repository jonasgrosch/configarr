import { logger } from "./logger";
import { InputConfigIndexer } from "./types/config.types";
import type { MergedIndexerResource, MergedTagResource } from "./__generated__/mergedTypes";
import type { IArrClient } from "./clients/unified-client";

type IndexerField = { name: string; value?: unknown };

const SENSITIVE_FIELDS = new Set(["apiKey", "password", "api_key"]);

type NormalizedIndexer = Omit<InputConfigIndexer, "tags"> & { tags?: number[] };

function stripSensitiveFields(fields: IndexerField[] = []): IndexerField[] {
  return fields.filter((f) => !SENSITIVE_FIELDS.has(f.name));
}

function normalizeTags(tagNames: string[] | undefined, serverTags: MergedTagResource[]): { tags?: number[]; missing: string[] } {
  if (tagNames === undefined) {
    return { tags: undefined, missing: [] };
  }

  const missing: string[] = [];
  const mapped: number[] = [];

  for (const name of tagNames) {
    const match = serverTags.find((t) => t.label === name);
    if (match?.id != null) {
      mapped.push(match.id);
    } else {
      missing.push(name);
    }
  }

  return { tags: mapped, missing };
}

function normalizeIndexer(desired: InputConfigIndexer, serverTags: MergedTagResource[]): { normalized: NormalizedIndexer; missingTags: string[] } {
  const { tags, missing } = normalizeTags(desired.tags, serverTags);
  const normalized: NormalizedIndexer = {
    ...desired,
    ...(tags !== undefined ? { tags } : {}),
  };
  return { normalized, missingTags: missing };
}

function findServerIndexer(current: MergedIndexerResource[], desired: NormalizedIndexer): MergedIndexerResource | undefined {
  return current.find((c) => c.name === desired.name && c.implementation === desired.implementation);
}

function areFieldsEqual(serverFields: IndexerField[] = [], desiredFields: IndexerField[] = []): boolean {
  const serverMap = new Map(serverFields.map((f) => [f.name, f.value]));
  const desiredMap = new Map(desiredFields.map((f) => [f.name, f.value]));

  if (serverMap.size !== desiredMap.size) return false;

  for (const [name, serverValue] of serverMap) {
    if (!desiredMap.has(name)) return false;
    if (JSON.stringify(serverValue) !== JSON.stringify(desiredMap.get(name))) return false;
  }

  return true;
}

function areTagsEqual(serverTags: number[] = [], desiredTags: number[] = []): boolean {
  if (serverTags.length !== desiredTags.length) return false;
  return [...serverTags].sort().join(",") === [...desiredTags].sort().join(",");
}

function hasIndexerChanged(current: MergedIndexerResource, desired: NormalizedIndexer): boolean {
  if (desired.enableRss !== undefined && current.enableRss !== desired.enableRss) return true;
  if (desired.enableAutomaticSearch !== undefined && current.enableAutomaticSearch !== desired.enableAutomaticSearch) return true;
  if (desired.enableInteractiveSearch !== undefined && current.enableInteractiveSearch !== desired.enableInteractiveSearch) return true;
  if (desired.priority !== undefined && current.priority !== desired.priority) return true;
  if (desired.protocol !== undefined && current.protocol !== desired.protocol) return true;
  if (desired.downloadClientId !== undefined && current.downloadClientId !== desired.downloadClientId) return true;
  if (desired.implementationName !== undefined && current.implementationName !== desired.implementationName) return true;
  if (desired.infoLink !== undefined && current.infoLink !== desired.infoLink) return true;
  if (desired.configContract !== undefined && current.configContract !== desired.configContract) return true;

  if (desired.tags !== undefined) {
    const currentTags = (current.tags ?? []) as number[];
    if (!areTagsEqual(currentTags, desired.tags)) return true;
  }

  if (desired.fields !== undefined) {
    const currentFields = stripSensitiveFields((current.fields ?? []) as IndexerField[]);
    const desiredFields = stripSensitiveFields(desired.fields);
    if (!areFieldsEqual(currentFields, desiredFields)) return true;
  }

  return false;
}

export type IndexersDiff = {
  toCreate: NormalizedIndexer[];
  toUpdate: { id: number; data: MergedIndexerResource }[];
  missingTags: string[];
};

export function calculateIndexersDiff(
  current: MergedIndexerResource[],
  desired: InputConfigIndexer[],
  serverTags: MergedTagResource[],
): IndexersDiff | undefined {
  const toCreate: NormalizedIndexer[] = [];
  const toUpdate: { id: number; data: MergedIndexerResource }[] = [];
  const missingTags: string[] = [];

  for (const desiredIndexer of desired) {
    const { normalized, missingTags: missingForIndexer } = normalizeIndexer(desiredIndexer, serverTags);
    missingTags.push(...missingForIndexer);

    const serverIndexer = findServerIndexer(current, normalized);
    if (!serverIndexer) {
      toCreate.push(normalized);
      continue;
    }

    if (hasIndexerChanged(serverIndexer, normalized)) {
      toUpdate.push({
        id: serverIndexer.id!,
        data: { ...serverIndexer, ...normalized } as MergedIndexerResource,
      });
    } else {
      logger.info(`Indexer unchanged: ${normalized.name} (${normalized.implementation})`);
    }
  }

  if (toCreate.length === 0 && toUpdate.length === 0) {
    return missingTags.length > 0 ? { toCreate, toUpdate, missingTags } : undefined;
  }

  return { toCreate, toUpdate, missingTags };
}

export async function applyIndexers(api: IArrClient, diff: IndexersDiff | undefined, dryRun: boolean): Promise<void> {
  if (!diff) {
    return;
  }

  for (const indexer of diff.toCreate) {
    if (dryRun) {
      logger.info(`DryRun: Would create Indexer: ${indexer.name} (${indexer.implementation})`);
    } else {
      logger.info(`Creating Indexer: ${indexer.name} (${indexer.implementation})`);
      try {
        await api.createIndexer(indexer);
      } catch (error: any) {
        logger.error(`Failed creating Indexer (${indexer.name})`);
        throw error;
      }
    }
  }

  for (const { id, data } of diff.toUpdate) {
    if (dryRun) {
      logger.info(`DryRun: Would update Indexer: ${data.name} (id=${id})`);
    } else {
      logger.info(`Updating Indexer: ${data.name} (id=${id})`);
      try {
        await api.updateIndexer(String(id), data);
      } catch (error: any) {
        logger.error(`Failed updating Indexer (${data.name})`);
        throw error;
      }
    }
  }
}
