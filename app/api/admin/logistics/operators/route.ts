import { NextResponse } from "next/server";

import {
  getAuthenticatedAdminSession,
  unauthorizedAdminResponse,
} from "../../../../../lib/auth/server";
import { listAvailableLogisticsOperators } from "../../../../../lib/logistics/delivery-operations";

export async function GET() {
  const session = await getAuthenticatedAdminSession([
    "operations-admin",
    "super-admin",
  ]);

  if (!session) {
    return unauthorizedAdminResponse();
  }

  const operators = await listAvailableLogisticsOperators();

  return NextResponse.json({
    data: operators,
    meta: {
      count: operators.length,
    },
    error: null,
  });
}
