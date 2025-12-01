import { logger } from "./logger";
import type { IArrClient } from "./clients/unified-client";
import type { InputConfigAuthSettings } from "./types/config.types";
import type { HostConfigResource } from "./types/auth.types";

type AuthPayloadFields = Pick<HostConfigResource, "authenticationMethod" | "authenticationRequired" | "username" | "password" | "passwordConfirmation">;

const COMPARABLE_FIELDS: Array<keyof AuthPayloadFields> = ["authenticationMethod", "authenticationRequired", "username"];

function mapAuthSettings(settings: InputConfigAuthSettings): Partial<AuthPayloadFields> {
  const mapped: Partial<AuthPayloadFields> = {};

  if (settings.authentication_method !== undefined) {
    mapped.authenticationMethod = settings.authentication_method;
  }

  if (settings.authentication_required !== undefined) {
    mapped.authenticationRequired = settings.authentication_required;
  }

  if (settings.username !== undefined) {
    mapped.username = settings.username;
  }

  if (settings.password !== undefined) {
    mapped.password = settings.password;
    mapped.passwordConfirmation = settings.password_confirmation ?? settings.password;
  } else if (settings.password_confirmation !== undefined) {
    mapped.passwordConfirmation = settings.password_confirmation;
  }

  return mapped;
}

export type AuthDiff = {
  id: string;
  payload: HostConfigResource;
};

export function calculateAuthDiff(current: HostConfigResource, desired: InputConfigAuthSettings): AuthDiff | undefined {
  const mapped = mapAuthSettings(desired);

  if (Object.keys(mapped).length === 0) {
    return undefined;
  }

  const hasComparableChanges = COMPARABLE_FIELDS.some((field) => mapped[field] !== undefined && current[field] !== mapped[field]);
  const hasPasswordUpdate = mapped.password !== undefined || mapped.passwordConfirmation !== undefined;

  if (!hasComparableChanges && !hasPasswordUpdate) {
    return undefined;
  }

  const payload: HostConfigResource = {
    ...current,
    ...mapped,
  };

  return {
    id: String(current.id ?? 1),
    payload,
  };
}

export async function syncAuthSettings(api: IArrClient, desired: InputConfigAuthSettings | undefined, dryRun: boolean): Promise<void> {
  if (!desired) {
    return;
  }

  const currentConfig = (await api.getHostConfig()) as HostConfigResource;
  const diff = calculateAuthDiff(currentConfig, desired);

  if (!diff) {
    return;
  }

  if (dryRun) {
    logger.info("DryRun: Would update authentication settings.");
    return;
  }

  logger.info("Updating authentication settings.");
  await api.updateHostConfig(diff.id, diff.payload);
}
