import { NextResponse } from "next/server";

import {
  getAuthenticatedAppSession,
  unauthorizedResponse,
} from "../../../../../lib/auth/server";
import {
  loadEvidenceForAccess,
  verifySignedEvidenceAccessToken,
} from "../../../../../lib/storage/evidence-access";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getAuthenticatedAppSession();

  if (!session) {
    return unauthorizedResponse("You must be signed in to access evidence files.");
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const payload = verifySignedEvidenceAccessToken(token);

  if (!payload) {
    return NextResponse.json(
      {
        data: null,
        meta: {},
        error: {
          code: "unauthorized",
          message: "This evidence link is invalid or has expired.",
          details: {},
        },
      },
      { status: 401 },
    );
  }

  try {
    const file = await loadEvidenceForAccess(payload.storageKey);

    if (file.type === "redirect") {
      return NextResponse.redirect(file.url);
    }

    return new NextResponse(file.body, {
      status: 200,
      headers: file.headers,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load evidence file.";
    const status = message === "Evidence file not found." ? 404 : 400;

    return NextResponse.json(
      {
        data: null,
        meta: {},
        error: {
          code: status === 404 ? "not_found" : "validation_error",
          message,
          details: {},
        },
      },
      { status },
    );
  }
}
