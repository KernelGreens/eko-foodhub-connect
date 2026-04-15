import { NextResponse } from "next/server";

import {
  getAuthenticatedVendorSession,
  unauthorizedVendorResponse,
} from "../../../../lib/auth/server";
import { getVendorOnboardingSnapshot } from "../../../../lib/vendor-onboarding";

export async function GET() {
  const session = await getAuthenticatedVendorSession();

  if (!session) {
    return unauthorizedVendorResponse();
  }

  const snapshot = await getVendorOnboardingSnapshot(session.userId);

  return NextResponse.json(
    {
      data: snapshot,
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
