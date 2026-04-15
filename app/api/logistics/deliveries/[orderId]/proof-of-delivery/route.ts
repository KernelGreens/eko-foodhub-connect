import { NextResponse } from "next/server";

import {
  getAuthenticatedLogisticsSession,
  unauthorizedLogisticsResponse,
} from "../../../../../../lib/auth/server";
import { captureProofOfDelivery } from "../../../../../../lib/logistics/delivery-operations";

type RouteContext = {
  params: Promise<{
    orderId: string;
  }>;
};

type ProofBody = {
  proofType?: "PHOTO" | "SIGNATURE" | "OTP" | "MANUAL_CONFIRMATION";
  proofValue?: string;
  proofUrl?: string;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getAuthenticatedLogisticsSession();

  if (!session) {
    return unauthorizedLogisticsResponse();
  }

  const { orderId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as ProofBody;

  if (!body.proofType) {
    return NextResponse.json(
      {
        data: null,
        meta: {},
        error: {
          code: "validation_error",
          message: "A proof type is required.",
          details: {},
        },
      },
      { status: 400 },
    );
  }

  try {
    const order = await captureProofOfDelivery(orderId, session.userId, {
      proofType: body.proofType,
      proofValue: body.proofValue,
      proofUrl: body.proofUrl,
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
        : "Unable to capture proof of delivery.";
    const status = message.includes("not found") ? 404 : 400;

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
