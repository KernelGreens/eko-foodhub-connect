import { NextResponse } from "next/server";

import { transitionOperatorOrderStatus } from "../../../../../../lib/orders/operator-orders";
import type { OrderStatus } from "../../../../../../types";

type RouteContext = {
  params: Promise<{
    orderId: string;
  }>;
};

type TransitionBody = {
  actorRole?: "vendor" | "admin";
  vendorId?: string;
  nextStatus?: OrderStatus;
  note?: string;
};

export async function POST(request: Request, context: RouteContext) {
  const { orderId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as TransitionBody;

  if (!body.nextStatus) {
    return NextResponse.json(
      {
        data: null,
        meta: {},
        error: {
          code: "validation_error",
          message: "A target order status is required.",
          details: {},
        },
      },
      { status: 400 },
    );
  }

  try {
    const order = await transitionOperatorOrderStatus(orderId, {
      actorRole: body.actorRole === "admin" ? "admin" : "vendor",
      vendorId: body.vendorId,
      nextStatus: body.nextStatus,
      note: body.note,
    });

    return NextResponse.json({
      data: order,
      meta: {},
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update order status.";
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
