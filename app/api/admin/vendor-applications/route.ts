import { NextResponse } from "next/server";

import {
  getAuthenticatedAdminSession,
  unauthorizedAdminResponse,
} from "../../../../lib/auth/server";
import { listVendorApplications } from "../../../../lib/vendor-applications/workflow";

export async function GET() {
  const session = await getAuthenticatedAdminSession([
    "operations-admin",
    "super-admin",
  ]);

  if (!session) {
    return unauthorizedAdminResponse();
  }

  const applications = await listVendorApplications();

  return NextResponse.json(
    {
      data: applications,
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
