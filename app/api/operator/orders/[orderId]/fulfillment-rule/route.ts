import { NextResponse } from "next/server";

import {
  getAuthenticatedOperatorSession,
  unauthorizedOperatorResponse,
} from "../../../../../../lib/auth/server";
import {
  applyVendorFulfillmentRule,
  type VendorFulfillmentRuleAction,
} from "../../../../../../lib/orders/operator-orders";

type RouteContext = {
  params: Promise<{
    orderId: string;
  }>;
};

type RuleBody = {
  action?: VendorFulfillmentRuleAction;
  note?: string;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getAuthenticatedOperatorSession();

  if (!session) {
    return unauthorizedOperatorResponse();
  }

  const { orderId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as RuleBody;

  try {
    const order = await applyVendorFulfillmentRule(orderId, {
      actorRole: session.role === "admin" ? "admin" : "vendor",
      vendorId: session.role === "vendor" ? session.vendorId : undefined,
      action: body.action as VendorFulfillmentRuleAction,
      note: body.note,
    });

    return NextResponse.json({
      data: order,
      meta: {},
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to apply fulfillment rule.";
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
