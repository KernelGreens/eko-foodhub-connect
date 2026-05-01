import type { Order } from "../../types";
import type { Prisma } from "../generated/prisma/client";

import { prisma } from "../db/prisma";
import { mapBackendOrderToFrontend } from "../orders/order-view-model";
import { createSignedEvidenceAccessUrl } from "../storage/evidence-access";

type LogisticsOperatorSummary = {
  id: string;
  name: string;
  email: string;
  phone: string;
  partnerName?: string;
};

type DeliveryOrderRecord = {
  id: string;
  buyerUserId: string;
  totalAmountKobo: number;
  deliveryFeeAmountKobo: number;
  status: string;
  paymentStatus: string;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
  buyerAddressSnapshotJson: unknown;
  fulfillmentGroups: Array<{
    id: string;
    vendorId: string;
    status: string;
    groupNumber: number;
    items: Array<{
      productListingId: string;
      quantity: number;
      unitPriceKobo: number;
      lineTotalKobo: number;
    }>;
    deliveryJobs: Array<{
      id: string;
      status: string;
      dispatchBatchId?: string | null;
      dispatchBatch?: {
        id: string;
        batchCode: string;
        status: string;
      } | null;
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
  payments?: Array<{
    paymentMethod: string;
  }>;
  statusEvents?: Array<{
    id: string;
    status: string;
    notes: string | null;
    createdAt: Date;
  }>;
};

function getOrderIncludeShape() {
  return {
    payments: {
      orderBy: {
        createdAt: "asc" as const,
      },
    },
    statusEvents: {
      orderBy: {
        createdAt: "asc" as const,
      },
    },
    fulfillmentGroups: {
      include: {
        items: true,
        deliveryJobs: {
          include: {
            dispatchBatch: {
              select: {
                id: true,
                batchCode: true,
                status: true,
              },
            },
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

type CaptureProofInput = {
  proofType: "PHOTO" | "SIGNATURE" | "OTP" | "MANUAL_CONFIRMATION";
  proofValue?: string;
  proofUrl?: string;
};

function buildDispatchBatchCode(orderId: string, groupCount: number) {
  return `DB-${orderId.slice(-6).toUpperCase()}-${groupCount}`;
}

function mapDestinationSnapshot(
  snapshot: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (snapshot === null || snapshot === undefined) {
    return undefined;
  }

  return snapshot as Prisma.InputJsonValue;
}

function mapFrontendStatusToDispatchBatchStatus(
  status: Order["status"],
): "OUT_FOR_DELIVERY" | "DELIVERED" {
  switch (status) {
    case "in-transit":
      return "OUT_FOR_DELIVERY";
    case "delivered":
      return "DELIVERED";
    default:
      throw new Error("Unsupported dispatch batch transition.");
  }
}

function mapDeliveryOrder(order: DeliveryOrderRecord): Order {
  return mapBackendOrderToFrontend(order, {
    createEvidenceAccessUrl: createSignedEvidenceAccessUrl,
  });
}

export async function listAvailableLogisticsOperators(): Promise<
  LogisticsOperatorSummary[]
> {
  if (!prisma) {
    return [];
  }

  const operators = await prisma.user.findMany({
    where: {
      logisticsProfile: {
        isNot: null,
      },
    },
    include: {
      logisticsProfile: true,
    },
    orderBy: {
      displayName: "asc",
    },
  });

  return operators.map((operator) => ({
    id: operator.id,
    name: operator.displayName,
    email: operator.email ?? "",
    phone: operator.phone ?? "",
    partnerName: operator.logisticsProfile?.partnerName ?? undefined,
  }));
}

export async function assignOrderToLogisticsOperator(
  orderId: string,
  operatorUserId: string,
) {
  if (!prisma) {
    throw new Error("Logistics assignment requires a database connection.");
  }

  const operator = await prisma.user.findFirst({
    where: {
      id: operatorUserId,
      logisticsProfile: {
        isNot: null,
      },
    },
  });

  if (!operator) {
    throw new Error("Selected logistics operator could not be found.");
  }

  const order = (await prisma.order.findUnique({
    where: {
      id: orderId,
    },
    include: {
      fulfillmentGroups: {
        include: {
          deliveryJobs: true,
        },
      },
    },
  })) as
    | (DeliveryOrderRecord & {
        fulfillmentGroups: Array<
          DeliveryOrderRecord["fulfillmentGroups"][number] & {
            deliveryJobs: Array<{
              id: string;
              status: string;
            }>;
          }
        >;
      })
    | null;

  if (!order) {
    throw new Error("Order not found.");
  }

  const activeGroups = order.fulfillmentGroups.filter(
    (group) => group.status !== "CANCELLED",
  );
  const readyGroups = activeGroups.filter(
    (group) => group.status === "READY_FOR_PICKUP",
  );

  if (readyGroups.length === 0 || readyGroups.length !== activeGroups.length) {
    throw new Error(
      "All active vendor fulfillment groups must be ready before assigning logistics.",
    );
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const existingDispatchBatch = await tx.dispatchBatch.findFirst({
      where: {
        orderId: order.id,
        status: {
          in: [
            "PENDING_ASSIGNMENT",
            "ASSIGNED",
            "PICKED_UP",
            "OUT_FOR_DELIVERY",
          ],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const dispatchBatch = existingDispatchBatch
      ? await tx.dispatchBatch.update({
          where: {
            id: existingDispatchBatch.id,
          },
          data: {
            operatorUserId,
            status: "ASSIGNED",
            destinationSnapshotJson: mapDestinationSnapshot(
              order.buyerAddressSnapshotJson,
            ),
            totalAmountKobo: order.totalAmountKobo,
            assignedAt: now,
            deliveredAt: null,
          },
        })
      : await tx.dispatchBatch.create({
          data: {
            batchCode: buildDispatchBatchCode(order.id, readyGroups.length),
            orderId: order.id,
            operatorUserId,
            status: "ASSIGNED",
            destinationSnapshotJson: mapDestinationSnapshot(
              order.buyerAddressSnapshotJson,
            ),
            totalAmountKobo: order.totalAmountKobo,
            assignedAt: now,
          },
        });

    for (const group of readyGroups) {
      const existingJob = group.deliveryJobs[0];

      if (existingJob) {
        await tx.deliveryJob.update({
          where: {
            id: existingJob.id,
          },
          data: {
            dispatchBatchId: dispatchBatch.id,
            assignedToUserId: operatorUserId,
            status: "ASSIGNED",
            events: {
              create: {
                status: "ASSIGNED",
                notes: `Assigned to ${operator.displayName}.`,
              },
            },
          },
        });
      } else {
        await tx.deliveryJob.create({
          data: {
            orderId: order.id,
            orderFulfillmentGroupId: group.id,
            dispatchBatchId: dispatchBatch.id,
            assignedToUserId: operatorUserId,
            deliveryMethod: "HUB_DISPATCH",
            status: "ASSIGNED",
            events: {
              create: {
                status: "ASSIGNED",
                notes: `Assigned to ${operator.displayName}.`,
              },
            },
          },
        });
      }
    }

    await tx.orderStatusEvent.create({
      data: {
        orderId: order.id,
        status: "READY_FOR_LOGISTICS",
        notes: `Assigned to logistics operator ${operator.displayName} under dispatch batch ${dispatchBatch.batchCode}.`,
        createdAt: now,
      },
    });
  });

  const updatedOrder = (await prisma.order.findUnique({
    where: {
      id: order.id,
    },
    include: getOrderIncludeShape(),
  })) as DeliveryOrderRecord | null;

  if (!updatedOrder) {
    throw new Error("Assigned order could not be reloaded.");
  }

  return mapDeliveryOrder(updatedOrder);
}

export async function getLogisticsDeliveries(operatorUserId: string) {
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
    include: getOrderIncludeShape(),
    orderBy: {
      createdAt: "desc",
    },
  });

  return orders.map((order) => mapDeliveryOrder(order as DeliveryOrderRecord));
}

function mapFrontendStatusToDeliveryJobStatus(status: Order["status"]) {
  switch (status) {
    case "in-transit":
      return "OUT_FOR_DELIVERY" as const;
    case "delivered":
      return "DELIVERED" as const;
    default:
      throw new Error("Unsupported logistics transition.");
  }
}

export async function transitionLogisticsDeliveryStatus(
  orderId: string,
  operatorUserId: string,
  nextStatus: Order["status"],
) {
  if (!prisma) {
    throw new Error("Logistics delivery updates require a database connection.");
  }

  if (!["in-transit", "delivered"].includes(nextStatus)) {
    throw new Error("Logistics can only move orders to in-transit or delivered.");
  }

  const order = (await prisma.order.findFirst({
    where: {
      id: orderId,
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
    include: getOrderIncludeShape(),
  })) as DeliveryOrderRecord | null;

  if (!order) {
    throw new Error("Assigned delivery not found.");
  }

  const assignedGroups = order.fulfillmentGroups.filter((group) =>
    group.deliveryJobs.some((job) => job.assignedToUserId === operatorUserId),
  );

  if (assignedGroups.length === 0) {
    throw new Error("No delivery assignment was found for this operator.");
  }

  const now = new Date();
  const nextDeliveryStatus = mapFrontendStatusToDeliveryJobStatus(nextStatus);
  const nextDispatchBatchStatus = mapFrontendStatusToDispatchBatchStatus(nextStatus);
  const assignedBatchIds = Array.from(
    new Set(
      assignedGroups.flatMap((group) =>
        group.deliveryJobs
          .filter((candidate) => candidate.assignedToUserId === operatorUserId)
          .map((job) => job.dispatchBatch?.id)
          .filter((value): value is string => Boolean(value)),
      ),
    ),
  );

  await prisma.$transaction(async (tx) => {
    for (const group of assignedGroups) {
      for (const job of group.deliveryJobs.filter(
        (candidate) => candidate.assignedToUserId === operatorUserId,
      )) {
        await tx.deliveryJob.update({
          where: {
            id: job.id,
          },
          data: {
            status: nextDeliveryStatus,
            pickedUpAt: nextStatus === "in-transit" ? now : undefined,
            deliveredAt: nextStatus === "delivered" ? now : undefined,
            events: {
              create: {
                status: nextDeliveryStatus,
                notes:
                  nextStatus === "in-transit"
                    ? "Order picked up and is out for delivery."
                    : "Order delivered to buyer.",
              },
            },
          },
        });
      }

      await tx.orderFulfillmentGroup.update({
        where: {
          id: group.id,
        },
        data:
          nextStatus === "in-transit"
            ? {
                status: "HANDED_TO_LOGISTICS",
                handedToLogisticsAt: now,
              }
            : {
                status: "DELIVERED",
                deliveredAt: now,
              },
      });
    }

    if (assignedBatchIds.length > 0) {
      await tx.dispatchBatch.updateMany({
        where: {
          id: {
            in: assignedBatchIds,
          },
        },
        data:
          nextStatus === "in-transit"
            ? {
                status: nextDispatchBatchStatus,
                pickedUpAt: now,
              }
            : {
                status: nextDispatchBatchStatus,
                deliveredAt: now,
              },
      });
    }

    await tx.order.update({
      where: {
        id: order.id,
      },
      data: {
        status: nextStatus === "in-transit" ? "OUT_FOR_DELIVERY" : "DELIVERED",
        statusEvents: {
          create: {
            status:
              nextStatus === "in-transit" ? "OUT_FOR_DELIVERY" : "DELIVERED",
            notes:
              nextStatus === "in-transit"
                ? "Logistics operator started delivery."
                : "Logistics operator confirmed delivery.",
          },
        },
      },
    });
  });

  const updatedOrder = (await prisma.order.findUnique({
    where: {
      id: order.id,
    },
    include: getOrderIncludeShape(),
  })) as DeliveryOrderRecord | null;

  if (!updatedOrder) {
    throw new Error("Updated delivery could not be reloaded.");
  }

  return mapDeliveryOrder(updatedOrder);
}

export async function captureProofOfDelivery(
  orderId: string,
  operatorUserId: string,
  input: CaptureProofInput,
) {
  if (!prisma) {
    throw new Error("Proof of delivery requires a database connection.");
  }

  if (!input.proofValue?.trim() && !input.proofUrl?.trim()) {
    throw new Error("Provide a proof value or proof URL before submitting delivery proof.");
  }

  const order = (await prisma.order.findFirst({
    where: {
      id: orderId,
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
    include: getOrderIncludeShape(),
  })) as DeliveryOrderRecord | null;

  if (!order) {
    throw new Error("Assigned delivery not found.");
  }

  const assignedJobs = order.fulfillmentGroups.flatMap((group) =>
    group.deliveryJobs.filter((job) => job.assignedToUserId === operatorUserId),
  );

  if (assignedJobs.length === 0) {
    throw new Error("No delivery assignment was found for this operator.");
  }

  await prisma.$transaction(async (tx) => {
    for (const job of assignedJobs) {
      await tx.proofOfDelivery.create({
        data: {
          deliveryJobId: job.id,
          capturedByUserId: operatorUserId,
          proofType: input.proofType,
          proofValue: input.proofValue?.trim() || null,
          storageKey: input.proofUrl?.trim() || null,
        },
      });
    }
  });

  const updatedOrder = (await prisma.order.findUnique({
    where: {
      id: order.id,
    },
    include: getOrderIncludeShape(),
  })) as DeliveryOrderRecord | null;

  if (!updatedOrder) {
    throw new Error("Updated delivery could not be reloaded.");
  }

  return mapDeliveryOrder(updatedOrder);
}
