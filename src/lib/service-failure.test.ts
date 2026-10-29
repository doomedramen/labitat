import { describe, expect, it } from "vitest";
import { serviceFailureReason } from "./service-failure";
describe("safe service failure reasons", () => {
  it.each([
    [new DOMException("Request timed out", "TimeoutError"), "Service request timed out"],
    [new Error("Whisparr error: 401"), "Service authentication failed (HTTP 401)"],
    [new Error("Whisparr error: 403"), "Service authentication failed (HTTP 403)"],
    [new Error("Whisparr error: 404"), "Service API endpoint not found (HTTP 404)"],
    [new Error("Whisparr error: 500"), "Service API request failed (HTTP 500)"],
    [new SyntaxError("secret HTML"), "Service returned an incompatible API response"],
    [new Error("https://user:secret@private.test?apikey=secret"), "Unable to reach service"],
  ])("categorizes %s without exposing raw error details", (error, expected) => {
    expect(serviceFailureReason(error)).toBe(expected);
  });
});
