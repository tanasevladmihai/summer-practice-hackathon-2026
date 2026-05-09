import { describe, expect, it } from "vitest";
import { getStore } from "../data/store";
import { login, register } from "./service";

describe("auth service", () => {
  it("registers a new user and creates session", async () => {
    const store = getStore();
    const beforeCount = store.users.length;
    
    const result = await register({
      email: "new_test@example.com",
      password: "password123",
      displayName: "New Tester"
    });

    expect(result.user.id).toBeTruthy();
    expect(result.user.email).toBe("new_test@example.com");
    expect(result.session.id).toBeTruthy();
    expect(result.session.userId).toBe(result.user.id);
    expect(store.users.length).toBe(beforeCount + 1);
  });

  it("fails to register duplicate email", async () => {
    await expect(
      register({
        email: "irina@showup2move.com", // existing seed data
        password: "password123",
        displayName: "Irina Clone"
      })
    ).rejects.toThrow("Email already in use.");
  });

  it("logs in with correct credentials", async () => {
    const result = await login("irina@showup2move.com", "password123");
    expect(result.user.email).toBe("irina@showup2move.com");
    expect(result.session.id).toBeTruthy();
  });

  it("fails to login with bad password", async () => {
    await expect(login("irina@showup2move.com", "wrong")).rejects.toThrow(
      "Invalid email or password."
    );
  });

  it("fails to login with unknown email", async () => {
    await expect(login("nobody@example.com", "wrong")).rejects.toThrow(
      "Invalid email or password."
    );
  });
});
