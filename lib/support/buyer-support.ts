import type {
  OrderSupportTicketSummary,
  SupportConversationMessage,
  SupportTicketAttachment,
} from "../../types";

import { prisma } from "../db/prisma";
import { createSignedEvidenceAccessUrl, isInternalEvidenceStorageKey } from "../storage/evidence-access";

type CreateBuyerSupportTicketInput = {
  message?: string;
  attachmentUrls?: string[];
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
  attachments: Array<{
    id: string;
    storageKey: string;
    mimeType: string | null;
    createdAt: Date;
  }>;
};

type OrderSupportTicketWithRequester = SupportTicketRecord & {
  requesterUserId: string;
};

function getAttachmentDisplayName(url: string) {
  if (isInternalEvidenceStorageKey(url)) {
    const normalized = url.replace(/^(blob:|s3:|local:)/, "");
    const filename = normalized.split("/").filter(Boolean).pop();

    if (filename) {
      return decodeURIComponent(filename);
    }
  }

  try {
    const parsed = new URL(url);
    const filename = parsed.pathname.split("/").filter(Boolean).pop();

    if (filename) {
      return decodeURIComponent(filename);
    }

    return parsed.hostname;
  } catch {
    return "Attachment";
  }
}

function normalizeAttachmentUrls(urls?: string[]) {
  if (!Array.isArray(urls)) {
    return [];
  }

  const uniqueUrls = [...new Set(urls.map((value) => value.trim()).filter(Boolean))].slice(0, 5);

  return uniqueUrls.map((value) => {
    let parsedUrl: URL;

    try {
      parsedUrl = new URL(value);
    } catch {
      if (isInternalEvidenceStorageKey(value)) {
        return value;
      }

      throw new Error(`Invalid attachment URL: ${value}`);
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error(`Attachment URLs must use http or https: ${value}`);
    }

    return parsedUrl.toString();
  });
}

function mapAttachments(
  attachments: SupportTicketRecord["attachments"],
): SupportTicketAttachment[] {
  return [...attachments]
    .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
    .map((attachment) => ({
      id: attachment.id,
      url: createSignedEvidenceAccessUrl(attachment.storageKey),
      mimeType: attachment.mimeType ?? undefined,
      displayName: getAttachmentDisplayName(attachment.storageKey),
      createdAt: attachment.createdAt,
    }));
}

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
  const attachments = mapAttachments(ticket.attachments);

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
    attachments,
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
          attachments: {
            orderBy: {
              createdAt: "asc",
            },
          },
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
          attachments: {
            orderBy: {
              createdAt: "asc",
            },
          },
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

  const trimmedMessage = input.message?.trim();
  const attachmentUrls = normalizeAttachmentUrls(input.attachmentUrls);
  const existingTicket = order.supportTickets[0];

  if (existingTicket) {
    if (trimmedMessage || attachmentUrls.length > 0) {
      const updatedTicket = await prisma.supportTicket.update({
        where: {
          id: existingTicket.id,
        },
        data: {
          status: "OPEN",
          notes: {
            create: trimmedMessage
              ? {
                  authorUserId: buyerUserId,
                  isInternal: false,
                  body: trimmedMessage,
                }
              : undefined,
          },
          attachments: attachmentUrls.length > 0
            ? {
                create: attachmentUrls.map((url) => ({
                  storageKey: url,
                })),
              }
            : undefined,
        },
        include: {
          attachments: {
            orderBy: {
              createdAt: "asc",
            },
          },
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

  const message = trimmedMessage || buildDefaultBuyerMessage(orderId);

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
      attachments: attachmentUrls.length > 0
        ? {
            create: attachmentUrls.map((url) => ({
              storageKey: url,
            })),
          }
        : undefined,
    },
    include: {
      attachments: {
        orderBy: {
          createdAt: "asc",
        },
      },
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
