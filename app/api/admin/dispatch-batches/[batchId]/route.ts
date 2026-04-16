import { NextResponse } from "next/server";

import {
  getAuthenticatedAdminSession,
  unauthorizedAdminResponse,
} from "../../../../../lib/auth/server";
import { updateDispatchBatch } from "../../../../../lib/logistics/dispatch-batches";

type RouteContext = {
  params: Promise<{
    batchId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getAuthenticatedAdminSession([
    "operations-admin",
    "super-admin",
  ]);

  if (!session) {
    return unauthorizedAdminResponse();
  }

  const { batchId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    operatorUserId?: string;
    notes?: string;
  };

  if (body.operatorUserId === undefined && body.notes === undefined) {
    return NextResponse.json(
      {
        data: null,
        meta: {},
        error: {
          code: "validation_error",
          message: "Provide an operator reassignment or notes update.",
          details: {},
        },
      },
      { status: 400 },
    );
  }

  try {
    const batch = await updateDispatchBatch(batchId, {
      operatorUserId: body.operatorUserId,
      notes: body.notes,
    });

    return NextResponse.json({
      data: batch,
      meta: {},
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to update this dispatch batch.";
    const status = message === "Dispatch batch not found." ? 404 : 400;

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
