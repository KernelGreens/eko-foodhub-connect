import { NextResponse } from "next/server";

import {
  getAuthenticatedLogisticsSession,
  unauthorizedLogisticsResponse,
} from "../../../../lib/auth/server";
import { getLogisticsDeliveries } from "../../../../lib/logistics/delivery-operations";

export async function GET() {
  const session = await getAuthenticatedLogisticsSession();

  if (!session) {
    return unauthorizedLogisticsResponse();
  }

  try {
    const deliveries = await getLogisticsDeliveries(session.userId);

    return NextResponse.json({
      data: deliveries,
      meta: {
        count: deliveries.length,
      },
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load logistics deliveries.";

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
