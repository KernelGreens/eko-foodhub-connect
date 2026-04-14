import { NextResponse } from "next/server";

import {
  getAuthenticatedBuyerSession,
  unauthorizedBuyerResponse,
} from "../../../../../lib/auth/server";
import { getBuyerOrderById } from "../../../../../lib/orders/read-orders";

type RouteContext = {
  params: Promise<{
    orderId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const session = await getAuthenticatedBuyerSession();

  if (!session) {
    return unauthorizedBuyerResponse();
  }

  const { orderId } = await context.params;
  const order = await getBuyerOrderById(orderId, session.userId);

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
