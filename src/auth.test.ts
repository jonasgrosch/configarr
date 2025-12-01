import { describe, expect, test, vi } from "vitest";
import type { HostConfigResource } from "./types/auth.types";
import { calculateAuthDiff, syncAuthSettings } from "./auth";
import type { IArrClient } from "./clients/unified-client";

vi.mock("./logger", () => ({
  logger: {
    info: vi.fn(),
  },
}));

const mockHostConfig = {
  id: 1,
  authenticationMethod: "forms",
  authenticationRequired: "enabled",
  username: "admin",
} as HostConfigResource;

describe("calculateAuthDiff", () => {
  test("returns undefined when no changes requested", () => {
    const result = calculateAuthDiff(mockHostConfig, {});
    expect(result).toBeUndefined();
  });

  test("detects authentication method change", () => {
    const result = calculateAuthDiff(mockHostConfig, { authentication_method: "basic" });
    expect(result).toBeDefined();
    expect(result?.payload.authenticationMethod).toBe("basic");
    expect(result?.id).toBe("1");
  });

  test("forces update when password provided", () => {
    const result = calculateAuthDiff(mockHostConfig, { password: "secret" });
    expect(result).toBeDefined();
    expect(result?.payload.password).toBe("secret");
    expect(result?.payload.passwordConfirmation).toBe("secret");
  });
});

describe("syncAuthSettings", () => {
  test("calls update when diff exists", async () => {
    const api = {
      getHostConfig: vi.fn().mockResolvedValue(mockHostConfig),
      updateHostConfig: vi.fn().mockResolvedValue(undefined),
    } as unknown as IArrClient;

    await syncAuthSettings(api, { authentication_method: "basic" }, false);

    expect(api.getHostConfig).toHaveBeenCalled();
    expect(api.updateHostConfig).toHaveBeenCalledWith("1", expect.objectContaining({ authenticationMethod: "basic" }));
  });

  test("skips update when no desired settings", async () => {
    const api = {
      getHostConfig: vi.fn(),
      updateHostConfig: vi.fn(),
    } as unknown as IArrClient;

    await syncAuthSettings(api, undefined, false);

    expect(api.getHostConfig).not.toHaveBeenCalled();
    expect(api.updateHostConfig).not.toHaveBeenCalled();
  });
});
