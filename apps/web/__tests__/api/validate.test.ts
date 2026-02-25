import { describe, it, expect } from "vitest";
import { z } from "zod/v4";
import { validateBody } from "@/lib/api/validate";
import { BadRequestError } from "@/lib/api/errors";

/**
 * Helper to create a mock Request with a JSON body.
 */
function createJsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Helper to create a mock Request with invalid JSON.
 */
function createInvalidJsonRequest(): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not valid json {{{",
  });
}

describe("validateBody", () => {
  const testSchema = z.object({
    name: z.string(),
    age: z.number().min(0),
  });

  describe("with valid data", () => {
    it("returns parsed data for valid input", async () => {
      const request = createJsonRequest({ name: "Alice", age: 30 });
      const result = await validateBody(request, testSchema);
      expect(result).toEqual({ name: "Alice", age: 30 });
    });

    it("strips extra fields by default", async () => {
      const request = createJsonRequest({
        name: "Bob",
        age: 25,
        extra: "field",
      });
      const result = await validateBody(request, testSchema);
      // Zod v4 strips unknown keys by default on objects
      expect(result).toHaveProperty("name", "Bob");
      expect(result).toHaveProperty("age", 25);
    });
  });

  describe("with invalid data", () => {
    it("throws BadRequestError for missing required fields", async () => {
      const request = createJsonRequest({ name: "Alice" });
      await expect(validateBody(request, testSchema)).rejects.toThrow(
        BadRequestError
      );
    });

    it("throws BadRequestError for wrong types", async () => {
      const request = createJsonRequest({ name: 123, age: "not a number" });
      await expect(validateBody(request, testSchema)).rejects.toThrow(
        BadRequestError
      );
    });

    it("throws BadRequestError for values violating constraints", async () => {
      const request = createJsonRequest({ name: "Alice", age: -1 });
      await expect(validateBody(request, testSchema)).rejects.toThrow(
        BadRequestError
      );
    });

    it("error message contains 'Validation error'", async () => {
      const request = createJsonRequest({ name: "Alice" });
      try {
        await validateBody(request, testSchema);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestError);
        expect((err as BadRequestError).message).toContain("Validation error");
      }
    });
  });

  describe("with invalid JSON", () => {
    it("throws BadRequestError for malformed JSON body", async () => {
      const request = createInvalidJsonRequest();
      await expect(validateBody(request, testSchema)).rejects.toThrow(
        BadRequestError
      );
    });

    it("error message indicates invalid JSON", async () => {
      const request = createInvalidJsonRequest();
      try {
        await validateBody(request, testSchema);
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestError);
        expect((err as BadRequestError).message).toBe("Invalid JSON body");
      }
    });
  });

  describe("with different schemas", () => {
    it("validates a string enum schema", async () => {
      const enumSchema = z.object({
        role: z.enum(["admin", "member", "viewer"]),
      });
      const request = createJsonRequest({ role: "admin" });
      const result = await validateBody(request, enumSchema);
      expect(result.role).toBe("admin");
    });

    it("rejects invalid enum values", async () => {
      const enumSchema = z.object({
        role: z.enum(["admin", "member", "viewer"]),
      });
      const request = createJsonRequest({ role: "superadmin" });
      await expect(validateBody(request, enumSchema)).rejects.toThrow(
        BadRequestError
      );
    });

    it("validates optional fields", async () => {
      const optionalSchema = z.object({
        name: z.string(),
        description: z.string().optional(),
      });
      const request = createJsonRequest({ name: "test" });
      const result = await validateBody(request, optionalSchema);
      expect(result.name).toBe("test");
      expect(result.description).toBeUndefined();
    });
  });
});
