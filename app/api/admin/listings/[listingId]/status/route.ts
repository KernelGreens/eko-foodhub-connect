import { NextResponse } from "next/server";

import {
  getAuthenticatedAdminSession,
  unauthorizedAdminResponse,
} from "../../../../../../lib/auth/server";
import { changeAdminListingStatus } from "../../../../../../lib/vendor-listings";

type AdminListingStatusBody = {
  action?: "publish" | "unpublish" | "return-to-draft";
};

export async function POST(
  request: Request,
  context: { params: Promise<{ listingId: string }> },
) {
  const session = await getAuthenticatedAdminSession([
    "operations-admin",
    "super-admin",
  ]);

  if (!session) {
    return unauthorizedAdminResponse();
  }

  try {
    const { listingId } = await context.params;
    const body = (await request.json()) as AdminListingStatusBody;

    if (
      body.action !== "publish" &&
      body.action !== "unpublish" &&
      body.action !== "return-to-draft"
    ) {
      return NextResponse.json(
        {
          data: null,
          meta: {},
          error: {
            code: "validation_error",
            message: "Listing moderation action is invalid.",
            details: {},
          },
        },
        { status: 400 },
      );
    }

    const listing = await changeAdminListingStatus(listingId, body.action);

    return NextResponse.json({
      data: listing,
      meta: {},
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Listing moderation action failed.";
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
