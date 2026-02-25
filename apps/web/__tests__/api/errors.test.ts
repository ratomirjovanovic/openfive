import { describe, it, expect } from "vitest";
import {
  ApiError,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  UnauthorizedError,
  ConflictError,
} from "@/lib/api/errors";

describe("ApiError", () => {
  it("has correct status code and message", () => {
    const err = new ApiError(500, "Internal error");
    expect(err.statusCode).toBe(500);
    expect(err.message).toBe("Internal error");
  });

  it("is an instance of Error", () => {
    const err = new ApiError(500, "Internal error");
    expect(err).toBeInstanceOf(Error);
  });

  it("has name 'ApiError'", () => {
    const err = new ApiError(500, "Internal error");
    expect(err.name).toBe("ApiError");
  });

  it("accepts optional error code", () => {
    const err = new ApiError(500, "Internal error", "internal_error");
    expect(err.code).toBe("internal_error");
  });

  it("code is undefined when not provided", () => {
    const err = new ApiError(500, "Internal error");
    expect(err.code).toBeUndefined();
  });

  describe("toJSON()", () => {
    it("returns correct JSON structure with code", () => {
      const err = new ApiError(500, "Internal error", "internal_error");
      expect(err.toJSON()).toEqual({
        error: {
          message: "Internal error",
          code: "internal_error",
          status: 500,
        },
      });
    });

    it("uses 'unknown_error' as default code when not provided", () => {
      const err = new ApiError(500, "Internal error");
      expect(err.toJSON()).toEqual({
        error: {
          message: "Internal error",
          code: "unknown_error",
          status: 500,
        },
      });
    });
  });
});

describe("NotFoundError", () => {
  it("has status code 404", () => {
    const err = new NotFoundError("User");
    expect(err.statusCode).toBe(404);
  });

  it("has correct message format", () => {
    const err = new NotFoundError("User");
    expect(err.message).toBe("User not found");
  });

  it("has code 'not_found'", () => {
    const err = new NotFoundError("User");
    expect(err.code).toBe("not_found");
  });

  it("is an instance of ApiError", () => {
    const err = new NotFoundError("User");
    expect(err).toBeInstanceOf(ApiError);
  });

  it("is an instance of Error", () => {
    const err = new NotFoundError("User");
    expect(err).toBeInstanceOf(Error);
  });

  it("uses the resource name in the message", () => {
    const err = new NotFoundError("Project");
    expect(err.message).toBe("Project not found");
  });
});

describe("ForbiddenError", () => {
  it("has status code 403", () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
  });

  it("has default message", () => {
    const err = new ForbiddenError();
    expect(err.message).toBe(
      "You do not have permission to perform this action"
    );
  });

  it("accepts custom message", () => {
    const err = new ForbiddenError("Custom forbidden message");
    expect(err.message).toBe("Custom forbidden message");
  });

  it("has code 'forbidden'", () => {
    const err = new ForbiddenError();
    expect(err.code).toBe("forbidden");
  });

  it("is an instance of ApiError", () => {
    const err = new ForbiddenError();
    expect(err).toBeInstanceOf(ApiError);
  });
});

describe("BadRequestError", () => {
  it("has status code 400", () => {
    const err = new BadRequestError("Invalid input");
    expect(err.statusCode).toBe(400);
  });

  it("has the provided message", () => {
    const err = new BadRequestError("Invalid input");
    expect(err.message).toBe("Invalid input");
  });

  it("has code 'bad_request'", () => {
    const err = new BadRequestError("Invalid input");
    expect(err.code).toBe("bad_request");
  });

  it("is an instance of ApiError", () => {
    const err = new BadRequestError("Invalid input");
    expect(err).toBeInstanceOf(ApiError);
  });
});

describe("UnauthorizedError", () => {
  it("has status code 401", () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
  });

  it("has default message", () => {
    const err = new UnauthorizedError();
    expect(err.message).toBe("Authentication required");
  });

  it("accepts custom message", () => {
    const err = new UnauthorizedError("Token expired");
    expect(err.message).toBe("Token expired");
  });

  it("has code 'unauthorized'", () => {
    const err = new UnauthorizedError();
    expect(err.code).toBe("unauthorized");
  });

  it("is an instance of ApiError", () => {
    const err = new UnauthorizedError();
    expect(err).toBeInstanceOf(ApiError);
  });
});

describe("ConflictError", () => {
  it("has status code 409", () => {
    const err = new ConflictError("Resource already exists");
    expect(err.statusCode).toBe(409);
  });

  it("has the provided message", () => {
    const err = new ConflictError("Resource already exists");
    expect(err.message).toBe("Resource already exists");
  });

  it("has code 'conflict'", () => {
    const err = new ConflictError("Resource already exists");
    expect(err.code).toBe("conflict");
  });

  it("is an instance of ApiError", () => {
    const err = new ConflictError("Resource already exists");
    expect(err).toBeInstanceOf(ApiError);
  });
});
