import { NextResponse } from "next/server";

import {
  getAuthenticatedLogisticsSession,
  unauthorizedLogisticsResponse,
} from "../../../../lib/auth/server";
import { listLogisticsDispatchBatches } from "../../../../lib/logistics/dispatch-batches";

export async function GET() {
  const session = await getAuthenticatedLogisticsSession();

  if (!session) {
    return unauthorizedLogisticsResponse();
  }

  const batches = await listLogisticsDispatchBatches(session.userId);

  return NextResponse.json({
    data: batches,
    meta: {
      count: batches.length,
    },
    error: null,
  });
}
