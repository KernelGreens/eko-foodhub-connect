import { NextResponse } from "next/server";

import {
  getAuthenticatedVendorSession,
  unauthorizedVendorResponse,
} from "../../../../lib/auth/server";
import {
  getVendorSettings,
  updateVendorSettings,
} from "../../../../lib/vendor-settings";

export async function GET() {
  const session = await getAuthenticatedVendorSession();

  if (!session) {
    return unauthorizedVendorResponse();
  }

  const settings = await getVendorSettings(session.userId, session.vendorId);

  return NextResponse.json(
    {
      data: settings,
      meta: {},
      error: null,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function PATCH(request: Request) {
  const session = await getAuthenticatedVendorSession();

  if (!session) {
    return unauthorizedVendorResponse();
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const settings = await updateVendorSettings(
      session.userId,
      session.vendorId,
      body,
    );

    return NextResponse.json({
      data: settings,
      meta: {},
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Vendor settings could not be updated.";
    const status =
      message.includes("required") ||
      message.includes("could not be found")
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
            status === 400
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
