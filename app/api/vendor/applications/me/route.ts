import { NextResponse } from "next/server";

import {
  getAuthenticatedAppSession,
  unauthorizedResponse,
} from "../../../../../lib/auth/server";
import { getMyVendorApplication } from "../../../../../lib/vendor-applications/workflow";

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
