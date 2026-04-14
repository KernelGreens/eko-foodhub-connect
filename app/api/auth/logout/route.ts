import { NextResponse } from "next/server";

import { buildClearedSessionCookie } from "../../../../lib/auth/session";

export async function POST() {
  const response = NextResponse.json({
    data: {
      success: true,
    },
    meta: {},
    error: null,
  });

  response.cookies.set(buildClearedSessionCookie());

  return response;
}
