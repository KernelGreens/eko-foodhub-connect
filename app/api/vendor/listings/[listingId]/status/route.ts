import { NextResponse } from "next/server";

import {
  getAuthenticatedVendorSession,
  unauthorizedVendorResponse,
} from "../../../../../../lib/auth/server";
import { changeVendorListingStatus } from "../../../../../../lib/vendor-listings";

type ListingStatusBody = {
  action?: "submit-for-review" | "unpublish";
};

export async function POST(
  request: Request,
  context: { params: Promise<{ listingId: string }> },
) {
  const session = await getAuthenticatedVendorSession();

  if (!session) {
    return unauthorizedVendorResponse();
  }

  try {
    const { listingId } = await context.params;
    const body = (await request.json()) as ListingStatusBody;

    if (body.action !== "submit-for-review" && body.action !== "unpublish") {
      return NextResponse.json(
        {
          data: null,
          meta: {},
          error: {
            code: "validation_error",
            message: "Listing action must be submit-for-review or unpublish.",
            details: {},
          },
        },
        { status: 400 },
      );
    }

    const listing = await changeVendorListingStatus(
      session.userId,
      listingId,
      body.action,
    );

    return NextResponse.json({
      data: listing,
      meta: {},
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Vendor listing status could not be updated.";
    const status =
      message.includes("not found")
        ? 404
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
