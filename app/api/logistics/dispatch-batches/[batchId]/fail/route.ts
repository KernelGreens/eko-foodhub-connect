import { NextResponse } from "next/server";

import {
  getAuthenticatedLogisticsSession,
  unauthorizedLogisticsResponse,
} from "../../../../../../lib/auth/server";
import { failDispatchBatch } from "../../../../../../lib/logistics/dispatch-batches";

type RouteContext = {
  params: Promise<{
    batchId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getAuthenticatedLogisticsSession();

  if (!session) {
    return unauthorizedLogisticsResponse();
  }

  const { batchId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    reason?: string;
  };

  if (!body.reason?.trim()) {
    return NextResponse.json(
      {
        data: null,
        meta: {},
        error: {
          code: "validation_error",
          message: "A failure reason is required.",
          details: {},
        },
      },
      { status: 400 },
    );
  }

  try {
    const batch = await failDispatchBatch(batchId, {
      reason: body.reason,
      actorUserId: session.userId,
      actorLabel: "logistics operator",
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
        : "Unable to report a delivery exception for this dispatch batch.";
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
