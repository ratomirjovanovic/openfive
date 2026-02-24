import { NextResponse } from "next/server";
import { ApiError } from "./errors";

export function jsonResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(error.toJSON(), { status: error.statusCode });
  }

  console.error("Unhandled error:", error);
  return NextResponse.json(
    {
      error: {
        message: "Internal server error",
        code: "internal_error",
        status: 500,
      },
    },
    { status: 500 }
  );
}

export function createdResponse<T>(data: T) {
  return jsonResponse(data, 201);
}

export function noContentResponse() {
  return new NextResponse(null, { status: 204 });
}
