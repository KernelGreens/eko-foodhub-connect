import { NextResponse } from "next/server";

import {
  getAuthenticatedLogisticsSession,
  unauthorizedLogisticsResponse,
} from "../../../../../../lib/auth/server";
import { transitionLogisticsDeliveryStatus } from "../../../../../../lib/logistics/delivery-operations";
import type { OrderStatus } from "../../../../../../types";

type RouteContext = {
  params: Promise<{
    orderId: string;
  }>;
};

type TransitionBody = {
  nextStatus?: OrderStatus;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getAuthenticatedLogisticsSession();

  if (!session) {
    return unauthorizedLogisticsResponse();
  }

  const { orderId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as TransitionBody;

  if (!body.nextStatus) {
    return NextResponse.json(
      {
        data: null,
        meta: {},
        error: {
          code: "validation_error",
          message: "A logistics delivery status is required.",
          details: {},
        },
      },
      { status: 400 },
    );
  }

  try {
    const order = await transitionLogisticsDeliveryStatus(
      orderId,
      session.userId,
      body.nextStatus,
    );

    return NextResponse.json({
      data: order,
      meta: {},
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to update logistics delivery status.";
    const status = message.includes("not found") ? 404 : 400;

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
