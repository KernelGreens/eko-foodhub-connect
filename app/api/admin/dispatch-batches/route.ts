import { NextResponse } from "next/server";

import {
  getAuthenticatedAdminSession,
  unauthorizedAdminResponse,
} from "../../../../lib/auth/server";
import { listAdminDispatchBatches } from "../../../../lib/logistics/dispatch-batches";

export async function GET() {
  const session = await getAuthenticatedAdminSession([
    "operations-admin",
    "super-admin",
  ]);

  if (!session) {
    return unauthorizedAdminResponse();
  }

  const batches = await listAdminDispatchBatches();

  return NextResponse.json({
    data: batches,
    meta: {
      count: batches.length,
    },
    error: null,
  });
}
