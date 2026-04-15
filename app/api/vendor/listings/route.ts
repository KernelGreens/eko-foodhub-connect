import { NextResponse } from "next/server";

import {
  getAuthenticatedVendorSession,
  unauthorizedVendorResponse,
} from "../../../../lib/auth/server";
import {
  createVendorListing,
  listVendorListings,
} from "../../../../lib/vendor-listings";

export async function GET() {
  const session = await getAuthenticatedVendorSession();

  if (!session) {
    return unauthorizedVendorResponse();
  }

  const listings = await listVendorListings(session.userId);

  return NextResponse.json(
    {
      data: listings,
      meta: {
        count: listings.length,
      },
      error: null,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST(request: Request) {
  const session = await getAuthenticatedVendorSession();

  if (!session) {
    return unauthorizedVendorResponse();
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const listing = await createVendorListing(session.userId, body);

    return NextResponse.json(
      {
        data: listing,
        meta: {},
        error: null,
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Vendor listing could not be created.";
    const status =
      message.includes("required") ||
      message.includes("greater") ||
      message.includes("valid") ||
      message.includes("integer")
        ? 400
        : message.includes("Database connection")
          ? 503
          : message.includes("Vendor account not found")
            ? 404
            : 500;

    return NextResponse.json(
      {
        data: null,
        meta: {},
        error: {
          code:
            status === 400
              ? "validation_error"
              : status === 404
                ? "not_found"
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
