import { NextResponse } from "next/server";

import {
  getAuthenticatedAdminSession,
  unauthorizedAdminResponse,
} from "../../../../lib/auth/server";
import { listBuyerSupportTickets } from "../../../../lib/support/admin-support";

export async function GET() {
  const session = await getAuthenticatedAdminSession([
    "operations-admin",
    "super-admin",
  ]);

  if (!session) {
    return unauthorizedAdminResponse();
  }

  const tickets = await listBuyerSupportTickets();

  return NextResponse.json({
    data: tickets,
    meta: {
      count: tickets.length,
    },
    error: null,
  });
}
