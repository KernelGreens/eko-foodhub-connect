import { NextResponse } from "next/server";

import {
  getAuthenticatedBuyerSession,
  unauthorizedBuyerResponse,
} from "../../../../lib/auth/server";
import { createOrderFromCartInput } from "../../../../lib/orders/create-order";
import { getBuyerOrders } from "../../../../lib/orders/read-orders";
import type { Address, PaymentMethod } from "../../../../types";

type CreateOrderBody = {
  items?: Array<{
    productId: string;
    quantity: number;
  }>;
  deliveryAddress?: Address;
  paymentMethod?: PaymentMethod;
  notes?: string;
};

export async function POST(request: Request) {
  const session = await getAuthenticatedBuyerSession();

  if (!session) {
    return unauthorizedBuyerResponse();
  }

  try {
    const body = (await request.json()) as CreateOrderBody;

    const items = Array.isArray(body.items) ? body.items : [];
    const deliveryAddress = body.deliveryAddress;
    const paymentMethod = body.paymentMethod;

    if (items.length === 0) {
      return NextResponse.json(
        {
          data: null,
          meta: {},
          error: {
            code: "validation_error",
            message: "At least one cart item is required.",
            details: {},
          },
        },
        { status: 400 },
      );
    }

    if (!deliveryAddress) {
      return NextResponse.json(
        {
          data: null,
          meta: {},
          error: {
            code: "validation_error",
            message: "Delivery address is required.",
            details: {},
          },
        },
        { status: 400 },
      );
    }

    if (!paymentMethod) {
      return NextResponse.json(
        {
          data: null,
          meta: {},
          error: {
            code: "validation_error",
            message: "Payment method is required.",
            details: {},
          },
        },
        { status: 400 },
      );
    }

    const result = await createOrderFromCartInput({
      buyerUserId: session.userId,
      items,
      deliveryAddress,
      paymentMethod,
      notes: body.notes,
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
      error instanceof Error ? error.message : "Unable to create order.";

    return NextResponse.json(
      {
        data: null,
        meta: {},
        error: {
          code: "validation_error",
          message,
          details: {},
        },
      },
      { status: 400 },
    );
  }
}

export async function GET() {
  const session = await getAuthenticatedBuyerSession();

  if (!session) {
    return unauthorizedBuyerResponse();
  }

  const orders = await getBuyerOrders(session.userId);

  return NextResponse.json({
    data: orders,
    meta: {
      count: orders.length,
    },
    error: null,
  });
}
