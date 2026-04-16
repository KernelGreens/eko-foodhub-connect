import { NextResponse } from "next/server";

import {
  getAuthenticatedAppSession,
  unauthorizedResponse,
} from "../../../../lib/auth/server";
import { saveEvidenceUpload } from "../../../../lib/storage/evidence-upload";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getAuthenticatedAppSession();

  if (!session) {
    return unauthorizedResponse("You must be signed in to upload evidence.");
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const category = formData.get("category");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          data: null,
          meta: {},
          error: {
            code: "validation_error",
            message: "A file upload is required.",
            details: {},
          },
        },
        { status: 400 },
      );
    }

    const uploadedFile = await saveEvidenceUpload(
      file,
      typeof category === "string" ? category : null,
    );

    return NextResponse.json({
      data: {
        ...uploadedFile,
        uploadedByRole: session.role,
      },
      meta: {},
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to upload evidence.";

    return NextResponse.json(
      {
        data: null,
        meta: {},
        error: {
          code: "validation_error",
          message,
          details: {},
        },
      },
      { status: 400 },
    );
  }
}
