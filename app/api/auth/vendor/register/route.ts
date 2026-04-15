import { NextResponse } from "next/server";

import { submitVendorApplication } from "../../../../../lib/vendor-applications/workflow";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const result = await submitVendorApplication(body);

    const response = NextResponse.json({
      data: {
        user: result.user,
        application: result.application,
      },
      meta: {},
      error: null,
    });

    response.cookies.set(result.cookie);

    return response;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Vendor application submission failed due to a server error.";
    const status =
      message.includes("exists") || message.includes("already")
        ? 409
        : message.includes("required") ||
            message.includes("Select") ||
            message.includes("Complete") ||
            message.includes("Password")
          ? 400
          : message.includes("Database connection")
            ? 503
            : 500;

    return NextResponse.json(
      {
        data: null,
        meta: {},
        error: {
          code:
            status === 409
              ? "conflict"
              : status === 400
                ? "validation_error"
                : status === 503
                  ? "service_unavailable"
                  : "internal_error",
          message,
          details: {},
        },
      },
      { status },
    );
  }
}
