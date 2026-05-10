import { NextResponse } from "next/server";

import {
  getAuthenticatedOperatorSession,
  unauthorizedOperatorResponse,
} from "../../../../../../../../lib/auth/server";
import {
  applyOperatorOrderItemFulfillmentAdjustment,
  type FulfillmentAdjustmentType,
} from "../../../../../../../../lib/orders/operator-orders";

type RouteContext = {
  params: Promise<{
    orderId: string;
    productListingId: string;
  }>;
};

type AdjustmentBody = {
  adjustmentType?: FulfillmentAdjustmentType;
  shortageQuantity?: number;
  substitutionDescription?: string;
  note?: string;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getAuthenticatedOperatorSession();

  if (!session) {
    return unauthorizedOperatorResponse();
  }

  const { orderId, productListingId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as AdjustmentBody;

  try {
    const order = await applyOperatorOrderItemFulfillmentAdjustment(
      orderId,
      productListingId,
      {
        actorRole: session.role === "admin" ? "admin" : "vendor",
        vendorId: session.role === "vendor" ? session.vendorId : undefined,
        adjustmentType: body.adjustmentType as FulfillmentAdjustmentType,
        shortageQuantity: body.shortageQuantity,
        substitutionDescription: body.substitutionDescription,
        note: body.note,
      },
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
        : "Unable to apply fulfillment adjustment.";
    const status =
      message === "Order not found." || message === "Order item not found."
        ? 404
        : 400;

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
