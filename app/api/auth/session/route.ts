import { NextResponse } from "next/server";

import { getAuthenticatedBuyerSession } from "../../../../lib/auth/server";

export async function GET() {
  const session = await getAuthenticatedBuyerSession();

  return NextResponse.json(
    {
      data: session
        ? {
            user: session.user,
          }
        : null,
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
