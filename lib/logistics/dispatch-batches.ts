import type { DispatchBatch } from "../../types";
import { createSignedEvidenceAccessUrl } from "../storage/evidence-access";

import { prisma } from "../db/prisma";

type DispatchBatchRecord = {
  id: string;
  batchCode: string;
  orderId: string;
  operatorUserId: string | null;
  status: string;
  destinationSnapshotJson: unknown;
  totalAmountKobo: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  assignedAt: Date | null;
  pickedUpAt: Date | null;
  deliveredAt: Date | null;
  operator: {
    id: string;
    displayName: string;
  } | null;
  order: {
    buyerUserId: string;
    buyerAddressSnapshotJson: unknown;
  };
  deliveryJobs: Array<{
    id: string;
    fulfillmentGroup: {
      id: string;
      vendor: {
        displayName: string;
      };
      items: Array<{
        id: string;
      }>;
    };
    proofOfDelivery: Array<{
      proofType: string;
      proofValue: string | null;
      storageKey: string | null;
      createdAt: Date;
    }>;
  }>;
};

function getDispatchBatchIncludeShape() {
  return {
    operator: {
      select: {
        id: true,
        displayName: true,
      },
    },
    order: {
      select: {
        buyerUserId: true,
        buyerAddressSnapshotJson: true,
      },
    },
    deliveryJobs: {
      include: {
        fulfillmentGroup: {
          include: {
            vendor: {
              select: {
                displayName: true,
              },
            },
            items: {
              select: {
                id: true,
              },
            },
          },
        },
        proofOfDelivery: {
          orderBy: {
            createdAt: "desc" as const,
          },
        },
      },
      orderBy: {
        createdAt: "asc" as const,
      },
    },
  };
}

function mapDispatchBatchStatus(
  value: string,
): DispatchBatch["status"] {
  switch (value) {
    case "ASSIGNED":
      return "assigned";
    case "PICKED_UP":
      return "picked-up";
    case "OUT_FOR_DELIVERY":
      return "out-for-delivery";
    case "DELIVERED":
      return "delivered";
    case "FAILED":
      return "failed";
    case "CANCELLED":
      return "cancelled";
    case "PENDING_ASSIGNMENT":
    default:
      return "pending-assignment";
  }
}

function mapProofType(
  value: string,
): NonNullable<DispatchBatch["proofOfDelivery"]>["proofType"] {
  switch (value) {
    case "PHOTO":
      return "photo";
    case "SIGNATURE":
      return "signature";
    case "OTP":
      return "otp";
    case "MANUAL_CONFIRMATION":
    default:
      return "manual-confirmation";
  }
}

function mapDispatchBatch(record: DispatchBatchRecord): DispatchBatch {
  const latestProof = record.deliveryJobs
    .flatMap((job) => job.proofOfDelivery)
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
  const vendorNames = Array.from(
    new Set(
      record.deliveryJobs.map(
        (job) => job.fulfillmentGroup.vendor.displayName,
      ),
    ),
  );
  const uniqueGroupIds = new Set(
    record.deliveryJobs.map((job) => job.fulfillmentGroup.id),
  );
  const destinationSource =
    typeof record.destinationSnapshotJson === "object" &&
    record.destinationSnapshotJson !== null
      ? record.destinationSnapshotJson
      : record.order.buyerAddressSnapshotJson;
  const destination =
    typeof destinationSource === "object" && destinationSource !== null
      ? destinationSource
      : { area: "", lga: "", state: "Lagos" };

  return {
    id: record.id,
    batchCode: record.batchCode,
    orderId: record.orderId,
    operatorId: record.operatorUserId ?? undefined,
    operatorName: record.operator?.displayName ?? undefined,
    status: mapDispatchBatchStatus(record.status),
    buyerId: record.order.buyerUserId,
    notes: record.notes ?? undefined,
    destination: {
      area: (destination as { area?: string }).area ?? "",
      lga: (destination as { lga?: string }).lga ?? "",
      state: (destination as { state?: string }).state ?? "Lagos",
    },
    fulfillmentGroupCount: uniqueGroupIds.size,
    vendorCount: vendorNames.length,
    vendorNames,
    itemCount: record.deliveryJobs.reduce(
      (sum, job) => sum + job.fulfillmentGroup.items.length,
      0,
    ),
    totalAmount: record.totalAmountKobo / 100,
    proofOfDelivery: latestProof
      ? {
          proofType: mapProofType(latestProof.proofType),
          proofValue: latestProof.proofValue ?? undefined,
          proofUrl: latestProof.storageKey
            ? createSignedEvidenceAccessUrl(latestProof.storageKey)
            : undefined,
          createdAt: latestProof.createdAt,
        }
      : undefined,
    assignedAt: record.assignedAt ?? undefined,
    pickedUpAt: record.pickedUpAt ?? undefined,
    deliveredAt: record.deliveredAt ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function listAdminDispatchBatches() {
  if (!prisma) {
    return [];
  }

  const batches = await prisma.dispatchBatch.findMany({
    include: getDispatchBatchIncludeShape(),
    orderBy: {
      createdAt: "desc",
    },
  });

  return batches.map((batch) => mapDispatchBatch(batch as DispatchBatchRecord));
}

export async function listLogisticsDispatchBatches(operatorUserId: string) {
  if (!prisma) {
    return [];
  }

  const batches = await prisma.dispatchBatch.findMany({
    where: {
      operatorUserId,
    },
    include: getDispatchBatchIncludeShape(),
    orderBy: {
      createdAt: "desc",
    },
  });

  return batches.map((batch) => mapDispatchBatch(batch as DispatchBatchRecord));
}

type UpdateDispatchBatchInput = {
  operatorUserId?: string;
  notes?: string;
};

type FailDispatchBatchInput = {
  reason: string;
  actorUserId?: string;
  actorLabel: string;
};

function mergeFailureNotes(
  existingNotes: string | null,
  actorLabel: string,
  reason: string,
) {
  const exceptionNote = `Delivery exception reported by ${actorLabel}: ${reason}`;

  if (!existingNotes?.trim()) {
    return exceptionNote;
  }

  return `${existingNotes.trim()}\n\n${exceptionNote}`;
}

export async function updateDispatchBatch(
  batchId: string,
  input: UpdateDispatchBatchInput,
) {
  if (!prisma) {
    throw new Error("Dispatch batch updates require a database connection.");
  }

  const batch = await prisma.dispatchBatch.findUnique({
    where: {
      id: batchId,
    },
    include: {
      deliveryJobs: {
        include: {
          assignedTo: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
      },
    },
  });

  if (!batch) {
    throw new Error("Dispatch batch not found.");
  }

  if (["DELIVERED", "CANCELLED"].includes(batch.status)) {
    throw new Error("Completed or closed dispatch batches cannot be edited.");
  }

  const notes =
    input.notes === undefined ? batch.notes : input.notes.trim() || null;

  let operator =
    batch.operatorUserId && !input.operatorUserId
      ? await prisma.user.findUnique({
          where: {
            id: batch.operatorUserId,
          },
          select: {
            id: true,
            displayName: true,
            logisticsProfile: {
              select: {
                id: true,
              },
            },
          },
        })
      : null;

  if (input.operatorUserId) {
    operator = await prisma.user.findFirst({
      where: {
        id: input.operatorUserId,
        logisticsProfile: {
          isNot: null,
        },
      },
      select: {
        id: true,
        displayName: true,
        logisticsProfile: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!operator) {
      throw new Error("Selected logistics operator could not be found.");
    }
  }

  const shouldReassign =
    input.operatorUserId !== undefined &&
    (input.operatorUserId !== batch.operatorUserId || batch.status === "FAILED");

  await prisma.$transaction(async (tx) => {
    await tx.dispatchBatch.update({
      where: {
        id: batch.id,
      },
      data: {
        notes,
        operatorUserId: input.operatorUserId ?? batch.operatorUserId,
        status: shouldReassign ? "ASSIGNED" : batch.status,
        assignedAt:
          shouldReassign || (!batch.assignedAt && input.operatorUserId)
            ? new Date()
            : batch.assignedAt,
        pickedUpAt: shouldReassign && batch.status === "FAILED" ? null : batch.pickedUpAt,
        deliveredAt: shouldReassign && batch.status === "FAILED" ? null : batch.deliveredAt,
      },
    });

    if (shouldReassign) {
      for (const job of batch.deliveryJobs) {
        await tx.deliveryJob.update({
          where: {
            id: job.id,
          },
          data: {
            assignedToUserId: input.operatorUserId,
            status: "ASSIGNED",
            failedReason: null,
            pickedUpAt: batch.status === "FAILED" ? null : undefined,
            deliveredAt: batch.status === "FAILED" ? null : undefined,
            events: {
              create: {
                status: "ASSIGNED",
                notes: `Dispatch batch reassigned to ${operator?.displayName ?? "new operator"}.`,
              },
            },
          },
        });
      }

      if (batch.status === "FAILED") {
        await tx.order.update({
          where: {
            id: batch.orderId,
          },
          data: {
            status: "READY_FOR_LOGISTICS",
            statusEvents: {
              create: {
                status: "READY_FOR_LOGISTICS",
                notes: `Dispatch batch ${batch.batchCode} reassigned to ${operator?.displayName ?? "new operator"} after delivery exception.`,
              },
            },
          },
        });
      }
    }
  });

  const updatedBatch = await prisma.dispatchBatch.findUnique({
    where: {
      id: batch.id,
    },
    include: getDispatchBatchIncludeShape(),
  });

  if (!updatedBatch) {
    throw new Error("Updated dispatch batch could not be reloaded.");
  }

  return mapDispatchBatch(updatedBatch as DispatchBatchRecord);
}

export async function failDispatchBatch(
  batchId: string,
  input: FailDispatchBatchInput,
) {
  if (!prisma) {
    throw new Error("Dispatch batch updates require a database connection.");
  }

  const reason = input.reason.trim();

  if (!reason) {
    throw new Error("Provide a failure reason before marking the dispatch batch as failed.");
  }

  const batch = await prisma.dispatchBatch.findUnique({
    where: {
      id: batchId,
    },
    include: {
      deliveryJobs: {
        include: {
          fulfillmentGroup: true,
        },
      },
    },
  });

  if (!batch) {
    throw new Error("Dispatch batch not found.");
  }

  if (input.actorUserId && batch.operatorUserId !== input.actorUserId) {
    throw new Error("This dispatch batch is not assigned to the current logistics operator.");
  }

  if (["DELIVERED", "CANCELLED"].includes(batch.status)) {
    throw new Error("Completed or closed dispatch batches cannot be marked as failed.");
  }

  const nextNotes = mergeFailureNotes(batch.notes, input.actorLabel, reason);

  await prisma.$transaction(async (tx) => {
    await tx.dispatchBatch.update({
      where: {
        id: batch.id,
      },
      data: {
        status: "FAILED",
        notes: nextNotes,
      },
    });

    for (const job of batch.deliveryJobs) {
      await tx.deliveryJob.update({
        where: {
          id: job.id,
        },
        data: {
          status: "FAILED",
          failedReason: reason,
          events: {
            create: {
              status: "FAILED",
              notes: `Dispatch batch ${batch.batchCode} failed: ${reason}`,
            },
          },
        },
      });

      await tx.orderFulfillmentGroup.update({
        where: {
          id: job.fulfillmentGroup.id,
        },
        data: {
          status: "READY_FOR_PICKUP",
        },
      });
    }

    await tx.order.update({
      where: {
        id: batch.orderId,
      },
      data: {
        status: "READY_FOR_LOGISTICS",
        statusEvents: {
          create: {
            status: "READY_FOR_LOGISTICS",
            notes: `Dispatch batch ${batch.batchCode} reported a delivery exception: ${reason}`,
          },
        },
      },
    });
  });

  const updatedBatch = await prisma.dispatchBatch.findUnique({
    where: {
      id: batch.id,
    },
    include: getDispatchBatchIncludeShape(),
  });

  if (!updatedBatch) {
    throw new Error("Updated dispatch batch could not be reloaded.");
  }

  return mapDispatchBatch(updatedBatch as DispatchBatchRecord);
}
