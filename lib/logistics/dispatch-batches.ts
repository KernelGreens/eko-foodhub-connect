import type { DispatchBatch } from "../../types";

import { prisma } from "../db/prisma";

type DispatchBatchOrderRecord = {
  id: string;
  buyerUserId: string;
  totalAmountKobo: number;
  createdAt: Date;
  updatedAt: Date;
  buyerAddressSnapshotJson: unknown;
  fulfillmentGroups: Array<{
    id: string;
    vendorId: string;
    vendor: {
      displayName: string;
    };
    items: Array<{
      id: string;
    }>;
    deliveryJobs: Array<{
      id: string;
      status: string;
      assignedToUserId: string | null;
      assignedTo: {
        id: string;
        displayName: string;
      } | null;
      proofOfDelivery: Array<{
        proofType: string;
        proofValue: string | null;
        storageKey: string | null;
        createdAt: Date;
      }>;
    }>;
  }>;
};

function getDispatchBatchIncludeShape() {
  return {
    fulfillmentGroups: {
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
        deliveryJobs: {
          include: {
            assignedTo: {
              select: {
                id: true,
                displayName: true,
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
      },
      orderBy: {
        groupNumber: "asc" as const,
      },
    },
  };
}

function mapDeliveryStatus(
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

function buildBatchCode(orderId: string, fulfillmentGroupCount: number) {
  return `DB-${orderId.slice(-6).toUpperCase()}-${fulfillmentGroupCount}`;
}

function mapOrderToDispatchBatch(
  order: DispatchBatchOrderRecord,
): DispatchBatch | null {
  const groupsWithJobs = order.fulfillmentGroups.filter(
    (group) => group.deliveryJobs.length > 0,
  );

  if (groupsWithJobs.length === 0) {
    return null;
  }

  const deliveryJobs = groupsWithJobs.flatMap((group) => group.deliveryJobs);
  const primaryJob = deliveryJobs[0];
  const latestProof = deliveryJobs
    .flatMap((job) => job.proofOfDelivery)
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
  const vendorNames = Array.from(
    new Set(groupsWithJobs.map((group) => group.vendor.displayName)),
  );
  const address =
    typeof order.buyerAddressSnapshotJson === "object" &&
    order.buyerAddressSnapshotJson !== null
      ? order.buyerAddressSnapshotJson
      : { area: "", lga: "", state: "Lagos" };

  return {
    batchCode: buildBatchCode(order.id, groupsWithJobs.length),
    orderId: order.id,
    operatorId: primaryJob.assignedToUserId ?? undefined,
    operatorName: primaryJob.assignedTo?.displayName ?? undefined,
    status: mapDeliveryStatus(primaryJob.status),
    buyerId: order.buyerUserId,
    destination: {
      area: (address as { area?: string }).area ?? "",
      lga: (address as { lga?: string }).lga ?? "",
      state: (address as { state?: string }).state ?? "Lagos",
    },
    fulfillmentGroupCount: groupsWithJobs.length,
    vendorCount: vendorNames.length,
    vendorNames,
    itemCount: groupsWithJobs.reduce((sum, group) => sum + group.items.length, 0),
    totalAmount: order.totalAmountKobo / 100,
    proofOfDelivery: latestProof
      ? {
          proofType: mapProofType(latestProof.proofType),
          proofValue: latestProof.proofValue ?? undefined,
          proofUrl: latestProof.storageKey ?? undefined,
          createdAt: latestProof.createdAt,
        }
      : undefined,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export async function listAdminDispatchBatches() {
  if (!prisma) {
    return [];
  }

  const orders = await prisma.order.findMany({
    where: {
      fulfillmentGroups: {
        some: {
          deliveryJobs: {
            some: {},
          },
        },
      },
    },
    include: getDispatchBatchIncludeShape(),
    orderBy: {
      createdAt: "desc",
    },
  });

  return orders
    .map((order) => mapOrderToDispatchBatch(order as DispatchBatchOrderRecord))
    .filter((batch): batch is DispatchBatch => Boolean(batch));
}

export async function listLogisticsDispatchBatches(operatorUserId: string) {
  if (!prisma) {
    return [];
  }

  const orders = await prisma.order.findMany({
    where: {
      fulfillmentGroups: {
        some: {
          deliveryJobs: {
            some: {
              assignedToUserId: operatorUserId,
            },
          },
        },
      },
    },
    include: getDispatchBatchIncludeShape(),
    orderBy: {
      createdAt: "desc",
    },
  });

  return orders
    .map((order) => mapOrderToDispatchBatch(order as DispatchBatchOrderRecord))
    .filter((batch): batch is DispatchBatch => Boolean(batch));
}
