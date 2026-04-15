import { NextResponse } from "next/server";

import {
  getAuthenticatedVendorSession,
  unauthorizedVendorResponse,
} from "../../../../../lib/auth/server";
import {
  deleteVendorListing,
  updateVendorListing,
} from "../../../../../lib/vendor-listings";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ listingId: string }> },
) {
  const session = await getAuthenticatedVendorSession();

  if (!session) {
    return unauthorizedVendorResponse();
  }

  try {
    const { listingId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const listing = await updateVendorListing(session.userId, listingId, body);

    return NextResponse.json({
      data: listing,
      meta: {},
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Vendor listing could not be updated.";
    const status =
      message.includes("not found")
        ? 404
        : message.includes("required") ||
            message.includes("greater") ||
            message.includes("valid") ||
            message.includes("integer")
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
            status === 404
              ? "not_found"
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

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ listingId: string }> },
) {
  const session = await getAuthenticatedVendorSession();

  if (!session) {
    return unauthorizedVendorResponse();
  }

  try {
    const { listingId } = await context.params;
    await deleteVendorListing(session.userId, listingId);

    return NextResponse.json({
      data: {
        id: listingId,
        deleted: true,
      },
      meta: {},
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Vendor listing could not be deleted.";
    const status = message.includes("not found") ? 404 : 500;

    return NextResponse.json(
      {
        data: null,
        meta: {},
        error: {
          code: status === 404 ? "not_found" : "internal_error",
          message,
          details: {},
        },
      },
      { status },
    );
  }
}
