import { NextResponse } from "next/server";

import {
  getAuthenticatedAppSession,
  getAuthenticatedVendorApplicantSession,
  unauthorizedResponse,
} from "../../../../../lib/auth/server";
import {
  getMyVendorApplication,
  updateVendorApplication,
} from "../../../../../lib/vendor-applications/workflow";

export async function GET() {
  const session = await getAuthenticatedAppSession();

  if (!session || !["vendor-applicant", "vendor"].includes(session.role)) {
    return unauthorizedResponse(
      "You must be signed in as a vendor applicant or vendor to continue.",
    );
  }

  const application = await getMyVendorApplication(session.userId);

  return NextResponse.json(
    {
      data: application,
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
  const session = await getAuthenticatedVendorApplicantSession();

  if (!session) {
    return unauthorizedResponse(
      "You must be signed in as a vendor applicant to update this application.",
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const application = await updateVendorApplication(session.userId, body);

    return NextResponse.json({
      data: application,
      meta: {},
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Vendor application could not be updated.";
    const status =
      message.includes("not found")
        ? 404
        : message.includes("required") ||
            message.includes("Select") ||
            message.includes("cannot") ||
            message.includes("valid")
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
