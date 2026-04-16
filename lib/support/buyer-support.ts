import type { OrderSupportTicketSummary, SupportConversationMessage } from "../../types";

import { prisma } from "../db/prisma";

type CreateBuyerSupportTicketInput = {
  message?: string;
};

type SupportTicketRecord = {
  id: string;
  ticketNumber: string;
  issueType: string;
  status: string;
  severity: string;
  currentQueue: string;
  slaDeadlineAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  notes: Array<{
    id: string;
    authorUserId: string | null;
    isInternal: boolean;
    body: string;
    createdAt: Date;
  }>;
};

type OrderSupportTicketWithRequester = SupportTicketRecord & {
  requesterUserId: string;
};

function mapSupportTicketStatus(
  value: string,
): OrderSupportTicketSummary["status"] {
  switch (value) {
    case "TRIAGED":
      return "triaged";
    case "WAITING_ON_VENDOR":
      return "waiting-on-vendor";
    case "WAITING_ON_LOGISTICS":
      return "waiting-on-logistics";
    case "WAITING_ON_BUYER":
      return "waiting-on-buyer";
    case "RESOLVED":
      return "resolved";
    case "CLOSED":
      return "closed";
    case "OPEN":
    default:
      return "open";
  }
}

function mapSupportTicketSeverity(
  value: string,
): OrderSupportTicketSummary["severity"] {
  switch (value) {
    case "LOW":
      return "low";
    case "MEDIUM":
      return "medium";
    case "CRITICAL":
      return "critical";
    case "HIGH":
    default:
      return "high";
  }
}

function mapSupportTicket(
  ticket: OrderSupportTicketWithRequester,
): OrderSupportTicketSummary {
  const now = new Date();
  const slaState: OrderSupportTicketSummary["slaState"] = ticket.slaDeadlineAt
    ? ticket.slaDeadlineAt.getTime() < now.getTime()
      ? "breached"
      : "on-track"
    : "none";
  const messages = ticket.notes
    .filter((note) => !note.isInternal)
    .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
    .map<SupportConversationMessage>((note) => ({
      id: note.id,
      body: note.body,
      authorRole: note.authorUserId === ticket.requesterUserId ? "buyer" : "support",
      authorLabel: note.authorUserId === ticket.requesterUserId ? "You" : "Support",
      isInternal: false,
      createdAt: note.createdAt,
    }));

  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    issueType: ticket.issueType,
    status: mapSupportTicketStatus(ticket.status),
    severity: mapSupportTicketSeverity(ticket.severity),
    currentQueue: ticket.currentQueue,
    latestMessage: [...messages].reverse()[0]?.body ?? undefined,
    slaDeadlineAt: ticket.slaDeadlineAt ?? undefined,
    slaState,
    messages,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}

function buildSupportTicketNumber() {
  return `SUP-${Date.now()}`;
}

function buildDefaultBuyerMessage(orderId: string) {
  return `Buyer requested support for delivery exception on order ${orderId}.`;
}

export async function getBuyerSupportTicketsForOrder(
  orderId: string,
  buyerUserId: string,
) {
  if (!prisma) {
    return [];
  }

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      buyerUserId,
    },
    select: {
      id: true,
      buyerUserId: true,
      supportTickets: {
        include: {
          notes: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!order) {
    throw new Error("Order not found.");
  }

  return order.supportTickets.map((ticket) =>
    mapSupportTicket({
      ...(ticket as SupportTicketRecord),
      requesterUserId: order.buyerUserId,
    }),
  );
}

export async function createBuyerSupportTicketForOrder(
  orderId: string,
  buyerUserId: string,
  input: CreateBuyerSupportTicketInput,
) {
  if (!prisma) {
    throw new Error("Support ticket creation requires a database connection.");
  }

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      buyerUserId,
    },
    include: {
      supportTickets: {
        where: {
          status: {
            in: ["OPEN", "TRIAGED", "WAITING_ON_VENDOR", "WAITING_ON_LOGISTICS", "WAITING_ON_BUYER"],
          },
          issueType: "DELIVERY_EXCEPTION",
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        include: {
          notes: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new Error("Order not found.");
  }

  const message =
    input.message?.trim() || buildDefaultBuyerMessage(orderId);
  const existingTicket = order.supportTickets[0];

  if (existingTicket) {
    if (message) {
      const updatedTicket = await prisma.supportTicket.update({
        where: {
          id: existingTicket.id,
        },
        data: {
          status: "OPEN",
          notes: {
            create: {
              authorUserId: buyerUserId,
              isInternal: false,
              body: message,
            },
          },
        },
        include: {
          notes: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

      return mapSupportTicket({
        ...(updatedTicket as SupportTicketRecord),
        requesterUserId: buyerUserId,
      });
    }

    return mapSupportTicket({
      ...(existingTicket as SupportTicketRecord),
      requesterUserId: buyerUserId,
    });
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      ticketNumber: buildSupportTicketNumber(),
      requesterUserId: buyerUserId,
      orderId,
      ticketSource: "BUYER",
      issueType: "DELIVERY_EXCEPTION",
      severity: "HIGH",
      currentQueue: "support-ops",
      status: "OPEN",
      slaDeadlineAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      notes: {
        create: {
          authorUserId: buyerUserId,
          isInternal: false,
          body: message,
        },
      },
    },
    include: {
      notes: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  return mapSupportTicket({
    ...(ticket as SupportTicketRecord),
    requesterUserId: buyerUserId,
  });
}
