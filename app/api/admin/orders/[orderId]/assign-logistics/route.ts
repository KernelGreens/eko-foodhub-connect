import { NextResponse } from "next/server";

import {
  getAuthenticatedAdminSession,
  unauthorizedAdminResponse,
} from "../../../../../../lib/auth/server";
import { assignOrderToLogisticsOperator } from "../../../../../../lib/logistics/delivery-operations";

type RouteContext = {
  params: Promise<{
    orderId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getAuthenticatedAdminSession([
    "operations-admin",
    "super-admin",
  ]);

  if (!session) {
    return unauthorizedAdminResponse();
  }

  const { orderId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    operatorUserId?: string;
  };

  if (!body.operatorUserId) {
    return NextResponse.json(
      {
        data: null,
        meta: {},
        error: {
          code: "validation_error",
          message: "A logistics operator must be selected before assignment.",
          details: {},
        },
      },
      { status: 400 },
    );
  }

  try {
    const order = await assignOrderToLogisticsOperator(
      orderId,
      body.operatorUserId,
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
        : "Unable to assign this order to logistics.";
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
