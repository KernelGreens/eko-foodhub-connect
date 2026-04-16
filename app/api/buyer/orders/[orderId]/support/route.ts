import { NextResponse } from "next/server";

import {
  getAuthenticatedBuyerSession,
  unauthorizedBuyerResponse,
} from "../../../../../../lib/auth/server";
import {
  createBuyerSupportTicketForOrder,
  getBuyerSupportTicketsForOrder,
} from "../../../../../../lib/support/buyer-support";

type RouteContext = {
  params: Promise<{
    orderId: string;
  }>;
};

type CreateSupportTicketBody = {
  message?: string;
};

export async function GET(_: Request, context: RouteContext) {
  const session = await getAuthenticatedBuyerSession();

  if (!session) {
    return unauthorizedBuyerResponse();
  }

  try {
    const { orderId } = await context.params;
    const tickets = await getBuyerSupportTicketsForOrder(orderId, session.userId);

    return NextResponse.json({
      data: tickets,
      meta: {
        count: tickets.length,
      },
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load support tickets.";
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

export async function POST(request: Request, context: RouteContext) {
  const session = await getAuthenticatedBuyerSession();

  if (!session) {
    return unauthorizedBuyerResponse();
  }

  try {
    const { orderId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as CreateSupportTicketBody;
    const ticket = await createBuyerSupportTicketForOrder(orderId, session.userId, {
      message: body.message,
    });

    return NextResponse.json({
      data: ticket,
      meta: {},
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create support ticket.";
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
