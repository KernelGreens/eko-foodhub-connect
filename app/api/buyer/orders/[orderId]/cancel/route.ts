import { NextResponse } from "next/server";

import { cancelBuyerOrder } from "../../../../../../lib/orders/cancel-order";

type RouteContext = {
  params: Promise<{
    orderId: string;
  }>;
};

type CancelOrderBody = {
  reason?: string;
};

export async function POST(request: Request, context: RouteContext) {
  const { orderId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as CancelOrderBody;

  try {
    const result = await cancelBuyerOrder(orderId, {
      reason: body.reason,
    });

    return NextResponse.json({
      data: result.order,
      meta: {
        usedFallback: result.usedFallback,
      },
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to cancel order.";
    const status = message === "Order not found." ? 404 : 400;

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
