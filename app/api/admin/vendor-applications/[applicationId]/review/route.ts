import { NextResponse } from "next/server";

import {
  getAuthenticatedAdminSession,
  unauthorizedAdminResponse,
} from "../../../../../../lib/auth/server";
import { reviewVendorApplication } from "../../../../../../lib/vendor-applications/workflow";

type ReviewBody = {
  action?: "approve" | "reject";
  rejectionReason?: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ applicationId: string }> },
) {
  const session = await getAuthenticatedAdminSession([
    "operations-admin",
    "super-admin",
  ]);

  if (!session) {
    return unauthorizedAdminResponse();
  }

  try {
    const { applicationId } = await context.params;
    const body = (await request.json()) as ReviewBody;
    const action = body.action;

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        {
          data: null,
          meta: {},
          error: {
            code: "validation_error",
            message: "Review action must be approve or reject.",
            details: {},
          },
        },
        { status: 400 },
      );
    }

    const application = await reviewVendorApplication({
      applicationId,
      reviewerUserId: session.userId,
      action,
      rejectionReason: body.rejectionReason,
    });

    return NextResponse.json({
      data: application,
      meta: {},
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Application review failed due to a server error.";
    const status =
      message.includes("not found")
        ? 404
        : message.includes("Provide") || message.includes("must")
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
