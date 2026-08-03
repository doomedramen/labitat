import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockEnv = vi.hoisted(() => ({ AUTH_ENABLED: true }));
const mockHasAdminUser = vi.hoisted(() => vi.fn());

vi.mock("@/lib/env", () => ({ env: mockEnv }));
vi.mock("@/lib/db/admin", () => ({ hasAdminUser: mockHasAdminUser }));

import { proxy } from "./proxy";

describe("proxy auth configuration", () => {
  beforeEach(() => {
    mockEnv.AUTH_ENABLED = true;
    mockHasAdminUser.mockReset();
  });

  it("allows the dashboard without an admin account when auth is disabled", async () => {
    mockEnv.AUTH_ENABLED = false;

    const response = await proxy(new NextRequest("http://localhost/"));

    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(mockHasAdminUser).not.toHaveBeenCalled();
  });

  it("redirects setup to the dashboard when auth is disabled", async () => {
    mockEnv.AUTH_ENABLED = false;

    const response = await proxy(new NextRequest("http://localhost/setup"));

    expect(response.headers.get("location")).toBe("http://localhost/");
    expect(mockHasAdminUser).not.toHaveBeenCalled();
  });
});
