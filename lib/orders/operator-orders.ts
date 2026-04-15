import type { Order } from "../../types";

import { prisma } from "../db/prisma";
import {
  isAllowedOrderStatusTransition,
  mapBackendOrderStatusToFrontend,
  mapBackendOrderToFrontend,
} from "./order-view-model";

type OperatorRole = "vendor" | "admin";

type BackendOrderWithRelations = {
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
    acceptedAt: Date | null;
    readyForPickupAt: Date | null;
    handedToLogisticsAt: Date | null;
    deliveredAt: Date | null;
    items: Array<{
      productListingId: string;
      quantity: number;
      unitPriceKobo: number;
      lineTotalKobo: number;
    }>;
    deliveryJobs: Array<{
      id: string;
      status: string;
      assignedToUserId: string | null;
      assignedTo: {
        id: string;
        displayName: string;
      } | null;
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

type TransitionInput = {
  actorRole: OperatorRole;
  vendorId?: string;
  nextStatus: Order["status"];
  note?: string;
};

const operatorStatusLabels: Record<Order["status"], string> = {
  pending: "Order received",
  confirmed: "Order confirmed by vendor",
  preparing: "Order moved to preparation",
  ready: "Order marked ready for logistics",
  "in-transit": "Order handed to logistics",
  delivered: "Order marked delivered",
  cancelled: "Order cancelled by operator",
};

function buildTransitionNote(status: Order["status"], note?: string) {
  return note?.trim() || operatorStatusLabels[status];
}

function getIncludeShape() {
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
            assignedTo: {
              select: {
                id: true,
                displayName: true,
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

function buildVendorScopedOrder(
  order: BackendOrderWithRelations,
  vendorId?: string,
): Order {
  if (!vendorId) {
    return mapBackendOrderToFrontend(order);
  }

  const filteredGroups = order.fulfillmentGroups.filter(
    (group) => group.vendorId === vendorId,
  );
  const scopedGroups =
    filteredGroups.length > 0 ? filteredGroups : order.fulfillmentGroups;
  const scopedFrontendStatus = aggregateOrderStatusFromGroups(scopedGroups);
  const scopedTotalAmountKobo = scopedGroups.reduce(
    (sum, group) =>
      sum + group.items.reduce((groupSum, item) => groupSum + item.lineTotalKobo, 0),
    0,
  );
  const scopedDeliveryFeeAmountKobo = 0;

  return mapBackendOrderToFrontend({
    ...order,
    status: mapFrontendStatusToOrderStatus(scopedFrontendStatus),
    totalAmountKobo: scopedTotalAmountKobo,
    deliveryFeeAmountKobo: scopedDeliveryFeeAmountKobo,
    fulfillmentGroups: scopedGroups,
  });
}

export async function getOperatorOrders(input: {
  actorRole: OperatorRole;
  vendorId?: string;
}) {
  if (!prisma) {
    return [];
  }

  const where =
    input.actorRole === "admin"
      ? {}
      : {
          fulfillmentGroups: {
            some: {
              vendorId: input.vendorId,
            },
          },
        };

  const orders = await prisma.order.findMany({
    where,
    include: getIncludeShape(),
    orderBy: {
      createdAt: "desc",
    },
  });

  return orders.map((order) =>
    buildVendorScopedOrder(order as BackendOrderWithRelations, input.vendorId),
  );
}

function mapFrontendStatusToOrderStatus(status: Order["status"]) {
  switch (status) {
    case "confirmed":
      return "ACCEPTED";
    case "preparing":
      return "PREPARING";
    case "ready":
      return "READY_FOR_LOGISTICS";
    case "in-transit":
      return "OUT_FOR_DELIVERY";
    case "delivered":
      return "DELIVERED";
    case "cancelled":
      return "CANCELLED";
    case "pending":
    default:
      return "PENDING_PAYMENT";
  }
}

function mapFrontendStatusToGroupUpdate(status: Order["status"], now: Date) {
  switch (status) {
    case "confirmed":
      return {
        status: "ACCEPTED" as const,
        acceptedAt: now,
      };
    case "preparing":
      return {
        status: "PREPARING" as const,
      };
    case "ready":
      return {
        status: "READY_FOR_PICKUP" as const,
        readyForPickupAt: now,
      };
    case "in-transit":
      return {
        status: "HANDED_TO_LOGISTICS" as const,
        handedToLogisticsAt: now,
      };
    case "delivered":
      return {
        status: "DELIVERED" as const,
        deliveredAt: now,
      };
    case "cancelled":
      return {
        status: "CANCELLED" as const,
      };
    case "pending":
    default:
      return {
        status: "PENDING" as const,
      };
  }
}

function aggregateOrderStatusFromGroups(
  groups: BackendOrderWithRelations["fulfillmentGroups"],
): Order["status"] {
  const statuses = groups.map((group) => group.status);

  if (statuses.every((status) => status === "DELIVERED")) {
    return "delivered";
  }

  if (
    statuses.some((status) =>
      ["HANDED_TO_LOGISTICS", "DELIVERED"].includes(status),
    )
  ) {
    return "in-transit";
  }

  if (
    statuses.every((status) =>
      ["READY_FOR_PICKUP", "HANDED_TO_LOGISTICS", "DELIVERED"].includes(status),
    )
  ) {
    return "ready";
  }

  if (
    statuses.some((status) =>
      ["PREPARING", "READY_FOR_PICKUP"].includes(status),
    )
  ) {
    return "preparing";
  }

  if (
    statuses.some((status) =>
      ["ACCEPTED", "PREPARING", "READY_FOR_PICKUP"].includes(status),
    )
  ) {
    return "confirmed";
  }

  if (statuses.every((status) => status === "CANCELLED")) {
    return "cancelled";
  }

  return "pending";
}

export async function transitionOperatorOrderStatus(
  orderId: string,
  input: TransitionInput,
) {
  if (!prisma) {
    throw new Error("Order transitions require a database connection.");
  }

  const order = (await prisma.order.findFirst({
    where:
      input.actorRole === "admin"
        ? { id: orderId }
        : {
            id: orderId,
            fulfillmentGroups: {
              some: {
                vendorId: input.vendorId,
              },
            },
          },
    include: getIncludeShape(),
  })) as BackendOrderWithRelations | null;

  if (!order) {
    throw new Error("Order not found.");
  }

  const currentFrontendStatus = mapBackendOrderStatusToFrontend(order.status);

  if (!isAllowedOrderStatusTransition(currentFrontendStatus, input.nextStatus)) {
    throw new Error(
      `Cannot move an order from ${currentFrontendStatus} to ${input.nextStatus}.`,
    );
  }

  if (
    input.actorRole === "admin" &&
    ["in-transit", "delivered"].includes(input.nextStatus)
  ) {
    throw new Error(
      "Use logistics dispatch and operator delivery actions for in-transit and delivered updates.",
    );
  }

  const targetGroupIds =
    input.actorRole === "admin"
      ? order.fulfillmentGroups.map((group) => group.id)
      : order.fulfillmentGroups
          .filter((group) => group.vendorId === input.vendorId)
          .map((group) => group.id);

  if (targetGroupIds.length === 0) {
    throw new Error("No matching fulfillment group found for this operator.");
  }

  if (
    input.actorRole === "vendor" &&
    input.nextStatus === "cancelled" &&
    targetGroupIds.length !== order.fulfillmentGroups.length
  ) {
    throw new Error(
      "Vendor-level cancellation for mixed-vendor orders is not supported yet.",
    );
  }

  const now = new Date();

  await prisma.orderFulfillmentGroup.updateMany({
    where: {
      id: {
        in: targetGroupIds,
      },
    },
    data: mapFrontendStatusToGroupUpdate(input.nextStatus, now),
  });

  const refreshedOrder = (await prisma.order.findUnique({
    where: {
      id: order.id,
    },
    include: getIncludeShape(),
  })) as BackendOrderWithRelations;

  const finalStatus =
    input.actorRole === "admin"
      ? input.nextStatus
      : aggregateOrderStatusFromGroups(refreshedOrder.fulfillmentGroups);

  const updatedOrder =
    finalStatus === currentFrontendStatus
      ? refreshedOrder
      : ((await prisma.order.update({
          where: {
            id: order.id,
          },
          data: {
            status: mapFrontendStatusToOrderStatus(finalStatus),
            cancelledAt: finalStatus === "cancelled" ? now : null,
            statusEvents: {
              create: {
                status: mapFrontendStatusToOrderStatus(finalStatus),
                notes: buildTransitionNote(input.nextStatus, input.note),
              },
            },
          },
          include: getIncludeShape(),
        })) as BackendOrderWithRelations);

  return buildVendorScopedOrder(updatedOrder, input.vendorId);
}
