import { NextResponse } from "next/server";

import { saveEvidenceUpload } from "../../../../lib/storage/evidence-upload";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

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

    const uploadedFile = await saveEvidenceUpload(file, "vendor-application");

    return NextResponse.json({
      data: uploadedFile,
      meta: {},
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to upload vendor application document.";

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
