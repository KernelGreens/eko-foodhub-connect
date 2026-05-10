import { NextResponse } from "next/server";

import {
  getAuthenticatedAdminSession,
  unauthorizedAdminResponse,
} from "../../../../../../lib/auth/server";
import {
  applyAdminOrderRecovery,
  type AdminOrderRecoveryAction,
} from "../../../../../../lib/orders/operator-orders";

type RouteContext = {
  params: Promise<{
    orderId: string;
  }>;
};

type RecoveryBody = {
  action?: AdminOrderRecoveryAction;
  note?: string;
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
  const body = (await request.json().catch(() => ({}))) as RecoveryBody;

  try {
    const order = await applyAdminOrderRecovery(orderId, {
      action: body.action as AdminOrderRecoveryAction,
      note: body.note ?? "",
    });

    return NextResponse.json({
      data: order,
      meta: {},
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to recover order.";
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
