import { NextResponse } from "next/server";

import {
  getAuthenticatedOperatorSession,
  unauthorizedOperatorResponse,
} from "../../../../lib/auth/server";
import { getOperatorOrders } from "../../../../lib/orders/operator-orders";

export async function GET() {
  const session = await getAuthenticatedOperatorSession();

  if (!session) {
    return unauthorizedOperatorResponse();
  }

  try {
    const orders = await getOperatorOrders({
      actorRole: session.role === "admin" ? "admin" : "vendor",
      vendorId: session.role === "vendor" ? session.vendorId : undefined,
    });

    return NextResponse.json({
      data: orders,
      meta: {
        count: orders.length,
      },
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load operator orders.";

    return NextResponse.json(
      {
        data: null,
        meta: {},
        error: {
          code: "internal_error",
          message,
          details: {},
        },
      },
      { status: 500 },
    );
  }
}
