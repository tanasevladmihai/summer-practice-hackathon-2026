import { describe, expect, it, vi } from "vitest";
import { getStore } from "../data/store";
import { requireCurrentUser, requireRole } from "./session";
import * as nextHeaders from "next/headers";

vi.mock("next/headers", () => ({
  cookies: vi.fn()
}));

describe("session service", () => {
  it("rejects when no session cookie exists", async () => {
    vi.mocked(nextHeaders.cookies).mockResolvedValue({
      get: () => undefined
    } as any);

    await expect(requireCurrentUser()).rejects.toThrow("Not authenticated.");
  });

  it("resolves when valid session exists", async () => {
    const store = getStore();
    const session = store.sessions[0];
    
    vi.mocked(nextHeaders.cookies).mockResolvedValue({
      get: () => ({ value: session!.id })
    } as any);

    const user = await requireCurrentUser();
    expect(user.id).toBe(session!.userId);
  });

  it("enforces roles correctly", async () => {
    const store = getStore();
    // admin session
    const adminSession = store.sessions.find(s => {
      const u = store.users.find(user => user.id === s.userId);
      return u?.roles.includes("admin");
    });

    vi.mocked(nextHeaders.cookies).mockResolvedValue({
      get: () => ({ value: adminSession!.id })
    } as any);

    const adminUser = await requireRole("admin");
    expect(adminUser.roles).toContain("admin");
    
    // regular user session
    const userSession = store.sessions.find(s => {
      const u = store.users.find(user => user.id === s.userId);
      return !u?.roles.includes("admin");
    });
    
    vi.mocked(nextHeaders.cookies).mockResolvedValue({
      get: () => ({ value: userSession!.id })
    } as any);
    
    await expect(requireRole("admin")).rejects.toThrow("Missing required role: admin");
  });
});
