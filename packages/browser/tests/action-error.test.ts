import { describe, it, expect } from "vitest";
import { toActionError } from "../src/utils/action-error";

describe("toActionError", () => {
  it("returns RefAmbiguousError for strict mode violation with count", () => {
    const error = new Error("strict mode violation: getByRole resolved to 3 elements");
    const result = toActionError(error, "e1");
    expect(result._tag).toBe("RefAmbiguousError");
    expect(result.ref).toBe("e1");
    if (result._tag === "RefAmbiguousError") {
      expect(result.matchCount).toBe("3");
    }
  });

  it("returns RefAmbiguousError for strict mode violation without count", () => {
    const error = new Error("strict mode violation");
    const result = toActionError(error, "e2");
    expect(result._tag).toBe("RefAmbiguousError");
    if (result._tag === "RefAmbiguousError") {
      expect(result.matchCount).toBe("multiple");
    }
  });

  it("returns RefBlockedError when element intercepts pointer events", () => {
    const error = new Error("element intercepts pointer events");
    const result = toActionError(error, "e3");
    expect(result._tag).toBe("RefBlockedError");
    expect(result.ref).toBe("e3");
  });

  it("returns RefNotVisibleError when element is not visible", () => {
    const error = new Error("element is not visible");
    const result = toActionError(error, "e4");
    expect(result._tag).toBe("RefNotVisibleError");
    expect(result.ref).toBe("e4");
  });

  it("returns RefNotVisibleError for not visible without matching Timeout", () => {
    const error = new Error("locator is not visible on the page");
    const result = toActionError(error, "e5");
    expect(result._tag).toBe("RefNotVisibleError");
  });

  it("returns ActionTimeoutError when action times out", () => {
    const error = new Error("Timeout 30000ms exceeded waiting for element");
    const result = toActionError(error, "e6");
    expect(result._tag).toBe("ActionTimeoutError");
    expect(result.ref).toBe("e6");
  });

  it("returns RefNotVisibleError for waiting-for-visible pattern", () => {
    const error = new Error("waiting for getByRole to be visible");
    const result = toActionError(error, "e7");
    expect(result._tag).toBe("RefNotVisibleError");
    expect(result.ref).toBe("e7");
  });

  it("returns ActionTimeoutError for unrecognized errors", () => {
    const error = new Error("something completely unknown happened");
    const result = toActionError(error, "e8");
    expect(result._tag).toBe("ActionTimeoutError");
  });

  it("handles non-Error values", () => {
    const result = toActionError("raw string error", "e9");
    expect(result._tag).toBe("ActionTimeoutError");
    expect(result.ref).toBe("e9");
  });

  it("preserves the ref in all error types", () => {
    const cases = [
      new Error("strict mode violation"),
      new Error("intercepts pointer events"),
      new Error("not visible"),
      new Error("Timeout exceeded"),
    ];
    for (const error of cases) {
      const result = toActionError(error, "e10");
      expect(result.ref).toBe("e10");
    }
  });
});
