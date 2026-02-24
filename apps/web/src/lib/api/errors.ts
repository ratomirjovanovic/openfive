export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }

  toJSON() {
    return {
      error: {
        message: this.message,
        code: this.code || "unknown_error",
        status: this.statusCode,
      },
    };
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string) {
    super(404, `${resource} not found`, "not_found");
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "You do not have permission to perform this action") {
    super(403, message, "forbidden");
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string) {
    super(400, message, "bad_request");
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Authentication required") {
    super(401, message, "unauthorized");
  }
}

export class ConflictError extends ApiError {
  constructor(message: string) {
    super(409, message, "conflict");
  }
}
