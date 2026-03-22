import { describe, expect, it } from "vite-plus/test";
import { JsonRpcParseError, SessionNotFoundError, TransportClosedError } from "../src/errors.js";

describe("ACP Errors", () => {
  describe("JsonRpcParseError", () => {
    it("formats message from cause", () => {
      const error = new JsonRpcParseError({ cause: "unexpected EOF" });
      expect(error.message).toContain("unexpected EOF");
      expect(error._tag).toBe("AcpJsonRpcParseError");
    });
  });

  describe("SessionNotFoundError", () => {
    it("includes session id in message", () => {
      const error = new SessionNotFoundError({ sessionId: "sess_missing" });
      expect(error.message).toContain("sess_missing");
      expect(error._tag).toBe("AcpSessionNotFoundError");
    });
  });

  describe("TransportClosedError", () => {
    it("has descriptive message", () => {
      const error = new TransportClosedError({});
      expect(error.message).toContain("closed");
      expect(error._tag).toBe("AcpTransportClosedError");
    });
  });
});
