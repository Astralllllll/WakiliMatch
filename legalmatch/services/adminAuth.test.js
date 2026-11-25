import { describe, expect, it } from "vitest";
import { isAdminLoginRateLimited, MAX_FAILED_ATTEMPTS } from "./adminAuth.js";

describe("isAdminLoginRateLimited", () => {
  it("allows a clean record", () => {
    expect(isAdminLoginRateLimited({ emailFailureCount: 0, ipFailureCount: 0 })).toBe(false);
  });

  it("allows up to one below the max for both email and IP", () => {
    expect(
      isAdminLoginRateLimited({
        emailFailureCount: MAX_FAILED_ATTEMPTS - 1,
        ipFailureCount: MAX_FAILED_ATTEMPTS - 1,
      })
    ).toBe(false);
  });

  it("locks out once the email failure count reaches the max", () => {
    expect(isAdminLoginRateLimited({ emailFailureCount: MAX_FAILED_ATTEMPTS, ipFailureCount: 0 })).toBe(true);
  });

  it("locks out once the IP failure count reaches the max, even for a different/unknown email", () => {
    expect(isAdminLoginRateLimited({ emailFailureCount: 0, ipFailureCount: MAX_FAILED_ATTEMPTS })).toBe(true);
  });

  it("locks out past the max, not just at it", () => {
    expect(isAdminLoginRateLimited({ emailFailureCount: MAX_FAILED_ATTEMPTS + 3, ipFailureCount: 0 })).toBe(true);
  });

  it("respects a custom maxAttempts override", () => {
    expect(isAdminLoginRateLimited({ emailFailureCount: 2, ipFailureCount: 0, maxAttempts: 2 })).toBe(true);
    expect(isAdminLoginRateLimited({ emailFailureCount: 1, ipFailureCount: 0, maxAttempts: 2 })).toBe(false);
  });
});
