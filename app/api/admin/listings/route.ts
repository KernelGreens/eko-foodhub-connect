import { NextResponse } from "next/server";

import {
  getAuthenticatedAdminSession,
  unauthorizedAdminResponse,
} from "../../../../lib/auth/server";
import { listAdminListings } from "../../../../lib/vendor-listings";

export async function GET() {
  const session = await getAuthenticatedAdminSession([
    "operations-admin",
    "super-admin",
  ]);

  if (!session) {
    return unauthorizedAdminResponse();
  }

  const listings = await listAdminListings();

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
