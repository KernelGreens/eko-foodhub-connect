import type { OrderSupportTicketSummary } from "../../types";

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
  createdAt: Date;
  updatedAt: Date;
  notes: Array<{
    body: string;
    createdAt: Date;
  }>;
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
  ticket: SupportTicketRecord,
): OrderSupportTicketSummary {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    issueType: ticket.issueType,
    status: mapSupportTicketStatus(ticket.status),
    severity: mapSupportTicketSeverity(ticket.severity),
    currentQueue: ticket.currentQueue,
    latestMessage: ticket.notes[0]?.body ?? undefined,
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
      supportTickets: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          notes: {
            where: {
              isInternal: false,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      },
    },
  });

  if (!order) {
    throw new Error("Order not found.");
  }

  return order.supportTickets.map((ticket) =>
    mapSupportTicket(ticket as SupportTicketRecord),
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
            where: {
              isInternal: false,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      },
    },
  });

  if (!order) {
    throw new Error("Order not found.");
  }

  const existingTicket = order.supportTickets[0];

  if (existingTicket) {
    return mapSupportTicket(existingTicket as SupportTicketRecord);
  }

  const message =
    input.message?.trim() || buildDefaultBuyerMessage(orderId);

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
        where: {
          isInternal: false,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  return mapSupportTicket(ticket as SupportTicketRecord);
}
