import { NextResponse } from "next/server";

import {
  getAuthenticatedOperatorSession,
  unauthorizedOperatorResponse,
} from "../../../../../../lib/auth/server";
import {
  reportOperatorOrderIssue,
  type FulfillmentIssueType,
} from "../../../../../../lib/orders/operator-orders";

type RouteContext = {
  params: Promise<{
    orderId: string;
  }>;
};

type IssueBody = {
  issueType?: FulfillmentIssueType;
  message?: string;
  affectedProductListingId?: string;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getAuthenticatedOperatorSession();

  if (!session) {
    return unauthorizedOperatorResponse();
  }

  const { orderId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as IssueBody;

  try {
    const order = await reportOperatorOrderIssue(orderId, {
      actorRole: session.role === "admin" ? "admin" : "vendor",
      vendorId: session.role === "vendor" ? session.vendorId : undefined,
      issueType: body.issueType as FulfillmentIssueType,
      message: body.message ?? "",
      affectedProductListingId: body.affectedProductListingId || undefined,
    });

    return NextResponse.json({
      data: order,
      meta: {},
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to report fulfillment issue.";
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
