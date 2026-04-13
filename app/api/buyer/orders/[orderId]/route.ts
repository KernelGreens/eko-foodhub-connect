import { NextResponse } from "next/server";

import { getBuyerOrderById } from "../../../../../lib/orders/read-orders";

type RouteContext = {
  params: Promise<{
    orderId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { orderId } = await context.params;
  const order = await getBuyerOrderById(orderId);

  if (!order) {
    return NextResponse.json(
      {
        data: null,
        meta: {},
        error: {
          code: "not_found",
          message: "Order not found.",
          details: {},
        },
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: order,
    meta: {},
    error: null,
  });
}
