import type {
  AdminSupportTicketSummary,
  SupportConversationMessage,
  SupportTicketAttachment,
} from "../../types";

import { prisma } from "../db/prisma";

type SupportTicketRecord = {
  id: string;
  ticketNumber: string;
  issueType: string;
  status: string;
  severity: string;
  currentQueue: string;
  liabilityCategory: string;
  slaDeadlineAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  assignedUser: {
    id: string;
    displayName: string;
  } | null;
  requester: {
    id: string;
    displayName: string;
    email: string | null;
    phone: string | null;
  };
  order: {
    id: string;
    status: string;
  } | null;
  notes: Array<{
    authorUserId: string | null;
    body: string;
    isInternal: boolean;
    createdAt: Date;
  }>;
  attachments: Array<{
    id: string;
    storageKey: string;
    mimeType: string | null;
    createdAt: Date;
  }>;
};

type UpdateBuyerSupportTicketInput = {
  status?: "OPEN" | "TRIAGED" | "WAITING_ON_VENDOR" | "WAITING_ON_LOGISTICS" | "WAITING_ON_BUYER" | "RESOLVED" | "CLOSED";
  currentQueue?: string;
  assignedUserId?: string;
  internalNote?: string;
  externalReply?: string;
  attachmentUrls?: string[];
};

function getAttachmentDisplayName(url: string) {
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
      url: attachment.storageKey,
      mimeType: attachment.mimeType ?? undefined,
      displayName: getAttachmentDisplayName(attachment.storageKey),
      createdAt: attachment.createdAt,
    }));
}

function mapStatus(
  value: string,
): AdminSupportTicketSummary["status"] {
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

function mapSeverity(
  value: string,
): AdminSupportTicketSummary["severity"] {
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

function mapLiabilityCategory(
  value: string,
): AdminSupportTicketSummary["liabilityCategory"] {
  switch (value) {
    case "VENDOR_FAULT":
      return "vendor-fault";
    case "LOGISTICS_FAULT":
      return "logistics-fault";
    case "PLATFORM_FAULT":
      return "platform-fault";
    case "SHARED_FAULT":
      return "shared-fault";
    case "PENDING_REVIEW":
    default:
      return "pending-review";
  }
}

function mapSupportTicket(
  ticket: SupportTicketRecord,
): AdminSupportTicketSummary {
  const now = new Date();
  const latestCustomerMessage = ticket.notes.find(
    (note) => !note.isInternal && note.authorUserId === ticket.requester.id,
  );
  const latestInternalNote = ticket.notes.find((note) => note.isInternal);
  const latestPublicReply = ticket.notes.find(
    (note) => !note.isInternal && note.authorUserId !== ticket.requester.id,
  );
  const messages = [...ticket.notes]
    .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
    .map<SupportConversationMessage>((note) => ({
      id: `${ticket.id}-${note.createdAt.getTime()}-${note.isInternal ? "internal" : "public"}`,
      body: note.body,
      authorRole: note.isInternal
        ? "internal"
        : note.authorUserId === ticket.requester.id
          ? "buyer"
          : "support",
      authorLabel: note.isInternal
        ? "Internal note"
        : note.authorUserId === ticket.requester.id
          ? ticket.requester.displayName
          : "Support",
      isInternal: note.isInternal,
      createdAt: note.createdAt,
    }));
  const attachments = mapAttachments(ticket.attachments);
  const slaState: AdminSupportTicketSummary["slaState"] = ticket.slaDeadlineAt
    ? ticket.slaDeadlineAt.getTime() < now.getTime() &&
      !["RESOLVED", "CLOSED"].includes(ticket.status)
      ? "breached"
      : "on-track"
    : "none";

  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    issueType: ticket.issueType,
    status: mapStatus(ticket.status),
    severity: mapSeverity(ticket.severity),
    currentQueue: ticket.currentQueue,
    liabilityCategory: mapLiabilityCategory(ticket.liabilityCategory),
    assignedAgent: ticket.assignedUser
      ? {
          id: ticket.assignedUser.id,
          name: ticket.assignedUser.displayName,
        }
      : undefined,
    requester: {
      id: ticket.requester.id,
      name: ticket.requester.displayName,
      email: ticket.requester.email ?? undefined,
      phone: ticket.requester.phone ?? undefined,
    },
    order: ticket.order
      ? {
          id: ticket.order.id,
          status: ticket.order.status,
        }
      : undefined,
    latestCustomerMessage: latestCustomerMessage?.body ?? undefined,
    latestInternalNote: latestInternalNote?.body ?? undefined,
    latestPublicReply: latestPublicReply?.body ?? undefined,
    slaDeadlineAt: ticket.slaDeadlineAt ?? undefined,
    slaState,
    messages,
    attachments,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}

export async function listBuyerSupportTickets() {
  if (!prisma) {
    return [];
  }

  const tickets = await prisma.supportTicket.findMany({
    where: {
      ticketSource: "BUYER",
    },
    include: {
      requester: {
        select: {
          id: true,
          displayName: true,
          email: true,
          phone: true,
        },
      },
      assignedUser: {
        select: {
          id: true,
          displayName: true,
        },
      },
      order: {
        select: {
          id: true,
          status: true,
        },
      },
      attachments: {
        orderBy: {
          createdAt: "asc",
        },
      },
      notes: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return tickets.map((ticket) => mapSupportTicket(ticket as SupportTicketRecord));
}

export async function updateBuyerSupportTicket(
  ticketId: string,
  adminUserId: string,
  input: UpdateBuyerSupportTicketInput,
) {
  if (!prisma) {
    throw new Error("Support ticket operations require a database connection.");
  }

  const attachmentUrls = normalizeAttachmentUrls(input.attachmentUrls);

  if (
    input.status === undefined &&
    input.currentQueue === undefined &&
    input.assignedUserId === undefined &&
    !input.internalNote?.trim()
    && !input.externalReply?.trim()
    && attachmentUrls.length === 0
  ) {
    throw new Error("Provide a status, queue, assignment, or note update.");
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: {
      id: ticketId,
    },
  });

  if (!ticket || ticket.ticketSource !== "BUYER") {
    throw new Error("Support ticket not found.");
  }

  await prisma.supportTicket.update({
    where: {
      id: ticket.id,
    },
    data: {
      status:
        input.status ??
        (input.externalReply?.trim() ? "WAITING_ON_BUYER" : undefined),
      currentQueue: input.currentQueue?.trim() || undefined,
      assignedUserId: input.assignedUserId ?? undefined,
      attachments: attachmentUrls.length > 0
        ? {
            create: attachmentUrls.map((url) => ({
              storageKey: url,
            })),
          }
        : undefined,
      notes: input.internalNote?.trim()
        ? {
            create: {
              authorUserId: adminUserId,
              isInternal: true,
              body: input.internalNote.trim(),
            },
          }
        : input.externalReply?.trim()
          ? {
              create: {
                authorUserId: adminUserId,
                isInternal: false,
                body: input.externalReply.trim(),
              },
            }
          : undefined,
    },
  });

  const updatedTicket = await prisma.supportTicket.findUnique({
    where: {
      id: ticket.id,
    },
    include: {
      requester: {
        select: {
          id: true,
          displayName: true,
          email: true,
          phone: true,
        },
      },
      assignedUser: {
        select: {
          id: true,
          displayName: true,
        },
      },
      order: {
        select: {
          id: true,
          status: true,
        },
      },
      attachments: {
        orderBy: {
          createdAt: "asc",
        },
      },
      notes: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!updatedTicket) {
    throw new Error("Updated support ticket could not be reloaded.");
  }

  return mapSupportTicket(updatedTicket as SupportTicketRecord);
}
