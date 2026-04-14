import { NextResponse } from "next/server";

import { getOperatorOrders } from "../../../../lib/orders/operator-orders";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const actorRole =
    searchParams.get("actorRole") === "admin" ? "admin" : "vendor";
  const vendorId = searchParams.get("vendorId") ?? undefined;

  try {
    const orders = await getOperatorOrders({
      actorRole,
      vendorId,
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
