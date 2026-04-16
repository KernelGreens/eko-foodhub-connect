import { NextResponse } from "next/server";

import {
  getAuthenticatedAdminSession,
  unauthorizedAdminResponse,
} from "../../../../../lib/auth/server";
import { updateBuyerSupportTicket } from "../../../../../lib/support/admin-support";

type RouteContext = {
  params: Promise<{
    ticketId: string;
  }>;
};

type UpdateSupportTicketBody = {
  status?: "OPEN" | "TRIAGED" | "WAITING_ON_VENDOR" | "WAITING_ON_LOGISTICS" | "WAITING_ON_BUYER" | "RESOLVED" | "CLOSED";
  currentQueue?: string;
  assignToMe?: boolean;
  internalNote?: string;
  externalReply?: string;
  attachmentUrls?: string[];
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getAuthenticatedAdminSession([
    "operations-admin",
    "super-admin",
  ]);

  if (!session) {
    return unauthorizedAdminResponse();
  }

  const { ticketId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as UpdateSupportTicketBody;

  try {
    const ticket = await updateBuyerSupportTicket(ticketId, session.userId, {
      status: body.status,
      currentQueue: body.currentQueue,
      assignedUserId: body.assignToMe ? session.userId : undefined,
      internalNote: body.internalNote,
      externalReply: body.externalReply,
      attachmentUrls: body.attachmentUrls,
    });

    return NextResponse.json({
      data: ticket,
      meta: {},
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update support ticket.";
    const status = message === "Support ticket not found." ? 404 : 400;

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
