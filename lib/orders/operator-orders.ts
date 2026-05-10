import type { Order } from "../../types";

import { prisma } from "../db/prisma";
import type { Prisma } from "../generated/prisma/client";
import type { OrderStatus as BackendOrderStatus } from "../generated/prisma/enums";
import { getInventoryStatuses } from "../inventory/stock";
import { createSignedEvidenceAccessUrl } from "../storage/evidence-access";
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
      id?: string;
      productListingId: string;
      quantity: number;
      unitPriceKobo: number;
      lineTotalKobo: number;
      substitutionStatus?: string | null;
    }>;
    deliveryJobs: Array<{
      id: string;
      status: string;
      assignedToUserId: string | null;
      dispatchBatch?: {
        id: string;
        batchCode: string;
        status: string;
      } | null;
      assignedTo: {
        id: string;
        displayName: string;
      } | null;
      proofOfDelivery?: Array<{
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

type TransitionInput = {
  actorRole: OperatorRole;
  vendorId?: string;
  nextStatus: Order["status"];
  note?: string;
};

export type FulfillmentIssueType =
  | "stock-shortage"
  | "quality-issue"
  | "prep-delay"
  | "item-unavailable"
  | "substitution-needed"
  | "other";

type FulfillmentIssueInput = {
  actorRole: OperatorRole;
  vendorId?: string;
  issueType: FulfillmentIssueType;
  message: string;
  affectedProductListingId?: string;
};

export type FulfillmentAdjustmentType =
  | "shortage"
  | "substitution"
  | "unavailable"
  | "resolved";

export type VendorFulfillmentRuleAction =
  | "cancel-fulfillment"
  | "continue-partial";

type FulfillmentAdjustmentInput = {
  actorRole: OperatorRole;
  vendorId?: string;
  adjustmentType: FulfillmentAdjustmentType;
  shortageQuantity?: number;
  substitutionDescription?: string;
  note?: string;
};

type VendorFulfillmentRuleInput = {
  actorRole: OperatorRole;
  vendorId?: string;
  action: VendorFulfillmentRuleAction;
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

const fulfillmentIssueLabels: Record<FulfillmentIssueType, string> = {
  "stock-shortage": "Stock shortage",
  "quality-issue": "Quality issue",
  "prep-delay": "Preparation delay",
  "item-unavailable": "Item unavailable",
  "substitution-needed": "Substitution needed",
  other: "Other fulfillment issue",
};

const fulfillmentAdjustmentStatus: Record<FulfillmentAdjustmentType, string | null> = {
  shortage: "SHORTAGE_REPORTED",
  substitution: "SUBSTITUTION_PROPOSED",
  unavailable: "UNAVAILABLE",
  resolved: "RESOLVED",
};

const blockedGroupStatuses = [
  "HANDED_TO_LOGISTICS",
  "DELIVERED",
  "CANCELLED",
] as const;

const fulfillmentAdjustmentLabels: Record<FulfillmentAdjustmentType, string> = {
  shortage: "Stock shortage recorded",
  substitution: "Substitution proposed",
  unavailable: "Item marked unavailable",
  resolved: "Fulfillment issue resolved",
};

function buildTransitionNote(status: Order["status"], note?: string) {
  return note?.trim() || operatorStatusLabels[status];
}

function buildFulfillmentIssueNote(input: FulfillmentIssueInput) {
  const label = fulfillmentIssueLabels[input.issueType];
  const affectedItem = input.affectedProductListingId
    ? ` Affected listing: ${input.affectedProductListingId}.`
    : "";

  return `Fulfillment issue reported by ${input.actorRole}: ${label}.${affectedItem} ${input.message.trim()}`;
}

function isFulfillmentIssueType(value: string): value is FulfillmentIssueType {
  return Object.prototype.hasOwnProperty.call(fulfillmentIssueLabels, value);
}

export function assertFulfillmentIssueInput(input: {
  issueType?: string;
  message?: string;
}) {
  if (!input.issueType || !isFulfillmentIssueType(input.issueType)) {
    throw new Error("A valid fulfillment issue type is required.");
  }

  if (!input.message?.trim()) {
    throw new Error("A fulfillment issue message is required.");
  }

  if (input.message.trim().length > 500) {
    throw new Error("Fulfillment issue message must be 500 characters or fewer.");
  }
}

function assertFulfillmentAdjustmentInput(input: FulfillmentAdjustmentInput) {
  if (!Object.prototype.hasOwnProperty.call(fulfillmentAdjustmentStatus, input.adjustmentType)) {
    throw new Error("A valid fulfillment adjustment type is required.");
  }

  if (
    ["shortage", "unavailable"].includes(input.adjustmentType) &&
    (!Number.isInteger(input.shortageQuantity) || (input.shortageQuantity ?? 0) <= 0)
  ) {
    throw new Error("A positive shortage quantity is required.");
  }

  if (
    input.adjustmentType === "substitution" &&
    !input.substitutionDescription?.trim()
  ) {
    throw new Error("A substitution description is required.");
  }

  if ((input.substitutionDescription?.trim().length ?? 0) > 300) {
    throw new Error("Substitution description must be 300 characters or fewer.");
  }

  if ((input.note?.trim().length ?? 0) > 500) {
    throw new Error("Adjustment note must be 500 characters or fewer.");
  }
}

function buildFulfillmentAdjustmentNote(
  productTitle: string,
  input: FulfillmentAdjustmentInput,
  releasedReservedQuantity: number,
) {
  const parts = [
    `${fulfillmentAdjustmentLabels[input.adjustmentType]} for ${productTitle}.`,
  ];

  if (input.adjustmentType === "shortage" || input.adjustmentType === "unavailable") {
    parts.push(`Short quantity: ${input.shortageQuantity}.`);
  }

  if (releasedReservedQuantity > 0) {
    parts.push(`Released ${releasedReservedQuantity} reserved unit(s) from fulfillment hold.`);
  }

  if (input.substitutionDescription?.trim()) {
    parts.push(`Substitution: ${input.substitutionDescription.trim()}`);
  }

  if (input.note?.trim()) {
    parts.push(`Note: ${input.note.trim()}`);
  }

  return parts.join(" ");
}

function assertVendorFulfillmentRuleInput(input: VendorFulfillmentRuleInput) {
  if (!["cancel-fulfillment", "continue-partial"].includes(input.action)) {
    throw new Error("A valid fulfillment rule action is required.");
  }

  if ((input.note?.trim().length ?? 0) > 500) {
    throw new Error("Fulfillment rule note must be 500 characters or fewer.");
  }
}

function buildVendorFulfillmentRuleNote(
  action: VendorFulfillmentRuleAction,
  groupNumber: number,
  note?: string,
) {
  const prefix =
    action === "cancel-fulfillment"
      ? `Vendor fulfillment group ${groupNumber} cancelled.`
      : `Vendor fulfillment group ${groupNumber} continued as partial fulfillment.`;

  return note?.trim() ? `${prefix} Note: ${note.trim()}` : prefix;
}

async function releaseReservedQuantityForOrderItem(
  tx: Prisma.TransactionClient,
  orderItem: {
    inventoryReservations: Array<{
      id: string;
      inventoryRecordId: string;
      quantity: number;
    }>;
  },
  quantityToRelease: number,
  markListingUnavailable: boolean,
) {
  let remainingQuantity = quantityToRelease;
  let releasedQuantity = 0;

  for (const reservation of orderItem.inventoryReservations) {
    if (remainingQuantity <= 0) {
      break;
    }

    const releaseQuantity = Math.min(remainingQuantity, reservation.quantity);

    const inventoryRecord = await tx.inventoryRecord.update({
      where: {
        id: reservation.inventoryRecordId,
      },
      data: {
        reservedQuantity: {
          decrement: releaseQuantity,
        },
      },
    });

    if (releaseQuantity === reservation.quantity) {
      await tx.inventoryReservation.delete({
        where: {
          id: reservation.id,
        },
      });
    } else {
      await tx.inventoryReservation.update({
        where: {
          id: reservation.id,
        },
        data: {
          quantity: {
            decrement: releaseQuantity,
          },
        },
      });
    }

    if (markListingUnavailable) {
      await tx.inventoryRecord.update({
        where: {
          id: inventoryRecord.id,
        },
        data: {
          stockStatus: "OUT_OF_STOCK",
        },
      });

      await tx.productListing.update({
        where: {
          id: inventoryRecord.productListingId,
        },
        data: {
          availabilityStatus: "UNAVAILABLE",
        },
      });
    } else {
      const statuses = getInventoryStatuses(inventoryRecord.availableQuantity);

      await tx.inventoryRecord.update({
        where: {
          id: inventoryRecord.id,
        },
        data: {
          stockStatus: statuses.inventoryStatus,
        },
      });

      await tx.productListing.update({
        where: {
          id: inventoryRecord.productListingId,
        },
        data: {
          availabilityStatus: statuses.listingStatus,
        },
      });
    }

    remainingQuantity -= releaseQuantity;
    releasedQuantity += releaseQuantity;
  }

  return releasedQuantity;
}

async function releaseRemainingReservationsForGroup(
  tx: Prisma.TransactionClient,
  groupId: string,
) {
  const orderItems = await tx.orderItem.findMany({
    where: {
      orderFulfillmentGroupId: groupId,
    },
    include: {
      inventoryReservations: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });
  let releasedQuantity = 0;

  for (const item of orderItems) {
    const itemReservationQuantity = item.inventoryReservations.reduce(
      (sum, reservation) => sum + reservation.quantity,
      0,
    );

    if (itemReservationQuantity > 0) {
      releasedQuantity += await releaseReservedQuantityForOrderItem(
        tx,
        item,
        itemReservationQuantity,
        false,
      );
    }
  }

  return releasedQuantity;
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

function buildVendorScopedOrder(
  order: BackendOrderWithRelations,
  vendorId?: string,
): Order {
  if (!vendorId) {
    return mapBackendOrderToFrontend(order, {
      createEvidenceAccessUrl: createSignedEvidenceAccessUrl,
    });
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

  return mapBackendOrderToFrontend(
    {
      ...order,
      status: mapFrontendStatusToOrderStatus(scopedFrontendStatus),
      totalAmountKobo: scopedTotalAmountKobo,
      deliveryFeeAmountKobo: scopedDeliveryFeeAmountKobo,
      fulfillmentGroups: scopedGroups,
    },
    {
      createEvidenceAccessUrl: createSignedEvidenceAccessUrl,
    },
  );
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

function mapAggregatedGroupStatusToBackend(
  status: Order["status"],
  hasCancelledGroups: boolean,
) {
  if (hasCancelledGroups && status === "ready") {
    return "READY_FOR_LOGISTICS" as const;
  }

  if (hasCancelledGroups && status === "preparing") {
    return "PARTIALLY_READY" as const;
  }

  return mapFrontendStatusToOrderStatus(status);
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

export async function reportOperatorOrderIssue(
  orderId: string,
  input: FulfillmentIssueInput,
) {
  if (!prisma) {
    throw new Error("Fulfillment issue reporting requires a database connection.");
  }

  assertFulfillmentIssueInput(input);

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

  if (
    input.affectedProductListingId &&
    !order.fulfillmentGroups.some(
      (group) =>
        (input.actorRole === "admin" || group.vendorId === input.vendorId) &&
        group.items.some(
          (item) => item.productListingId === input.affectedProductListingId,
        ),
    )
  ) {
    throw new Error("Affected item does not belong to this operator order.");
  }

  const updatedOrder = (await prisma.order.update({
    where: {
      id: order.id,
    },
    data: {
      statusEvents: {
        create: {
          status: order.status as BackendOrderStatus,
          notes: buildFulfillmentIssueNote(input),
        },
      },
    },
    include: getIncludeShape(),
  })) as unknown as BackendOrderWithRelations;

  return buildVendorScopedOrder(updatedOrder, input.vendorId);
}

export async function applyOperatorOrderItemFulfillmentAdjustment(
  orderId: string,
  productListingId: string,
  input: FulfillmentAdjustmentInput,
) {
  if (!prisma) {
    throw new Error("Fulfillment adjustments require a database connection.");
  }

  assertFulfillmentAdjustmentInput(input);

  const updatedOrder = await prisma.$transaction(async (tx) => {
    const orderItem = await tx.orderItem.findFirst({
      where:
        input.actorRole === "admin"
          ? {
              productListingId,
              fulfillmentGroup: {
                orderId,
              },
            }
          : {
              productListingId,
              fulfillmentGroup: {
                orderId,
                vendorId: input.vendorId,
              },
            },
      include: {
        inventoryReservations: {
          orderBy: {
            createdAt: "asc",
          },
        },
        fulfillmentGroup: {
          include: {
            order: true,
          },
        },
      },
    });

    if (!orderItem) {
      throw new Error("Order item not found.");
    }

    const shortageQuantity =
      input.adjustmentType === "unavailable"
        ? input.shortageQuantity ?? orderItem.quantity
        : input.shortageQuantity ?? 0;

    if (shortageQuantity > orderItem.quantity) {
      throw new Error("Shortage quantity cannot exceed ordered quantity.");
    }

    const releasedReservedQuantity =
      input.adjustmentType === "shortage" || input.adjustmentType === "unavailable"
        ? await releaseReservedQuantityForOrderItem(
            tx,
            orderItem,
            shortageQuantity,
            input.adjustmentType === "unavailable",
          )
        : 0;

    await tx.orderItem.update({
      where: {
        id: orderItem.id,
      },
      data: {
        substitutionStatus: fulfillmentAdjustmentStatus[input.adjustmentType],
      },
    });

    await tx.orderStatusEvent.create({
      data: {
        orderId,
        status: orderItem.fulfillmentGroup.order.status as BackendOrderStatus,
        notes: buildFulfillmentAdjustmentNote(
          orderItem.productTitleSnapshot,
          input,
          releasedReservedQuantity,
        ),
      },
    });

    const refreshedOrder = await tx.order.findUnique({
      where: {
        id: orderId,
      },
      include: getIncludeShape(),
    });

    if (!refreshedOrder) {
      throw new Error("Order not found.");
    }

    return refreshedOrder as unknown as BackendOrderWithRelations;
  });

  return buildVendorScopedOrder(updatedOrder, input.vendorId);
}

export async function applyVendorFulfillmentRule(
  orderId: string,
  input: VendorFulfillmentRuleInput,
) {
  if (!prisma) {
    throw new Error("Vendor fulfillment rules require a database connection.");
  }

  assertVendorFulfillmentRuleInput(input);

  if (input.actorRole === "vendor" && !input.vendorId) {
    throw new Error("Vendor fulfillment rules require a vendor context.");
  }

  const updatedOrder = await prisma.$transaction(async (tx) => {
    const order = (await tx.order.findFirst({
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

    if (["OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"].includes(order.status)) {
      throw new Error("This fulfillment rule cannot be applied after logistics has started or the order is closed.");
    }

    const targetGroups =
      input.actorRole === "admin"
        ? order.fulfillmentGroups.filter(
            (group) => !blockedGroupStatuses.includes(group.status as typeof blockedGroupStatuses[number]),
          )
        : order.fulfillmentGroups.filter(
            (group) =>
              group.vendorId === input.vendorId &&
              !blockedGroupStatuses.includes(group.status as typeof blockedGroupStatuses[number]),
          );

    if (targetGroups.length !== 1) {
      throw new Error(
        targetGroups.length === 0
          ? "No eligible vendor fulfillment group found."
          : "Choose one vendor fulfillment group before applying this rule.",
      );
    }

    const group = targetGroups[0];
    const activeDeliveryJob = group.deliveryJobs.find((job) =>
      ["ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"].includes(job.status),
    );

    if (activeDeliveryJob) {
      throw new Error("This fulfillment group is already assigned to logistics.");
    }

    const itemIssueCount = group.items.filter((item) =>
      ["SHORTAGE_REPORTED", "SUBSTITUTION_PROPOSED", "UNAVAILABLE"].includes(
        item.substitutionStatus ?? "",
      ),
    ).length;
    const unavailableItemCount = group.items.filter(
      (item) => item.substitutionStatus === "UNAVAILABLE",
    ).length;

    if (input.action === "continue-partial") {
      if (itemIssueCount === 0) {
        throw new Error("Record an item shortage, substitution, or unavailable item before continuing as partial fulfillment.");
      }

      if (unavailableItemCount >= group.items.length) {
        throw new Error("All items are unavailable. Cancel this fulfillment instead.");
      }

      await tx.orderFulfillmentGroup.update({
        where: {
          id: group.id,
        },
        data: {
          status: "READY_FOR_PICKUP",
          readyForPickupAt: new Date(),
          notes: input.note?.trim() || "Continuing with partial fulfillment.",
        },
      });
    } else {
      const releasedQuantity = await releaseRemainingReservationsForGroup(tx, group.id);

      await tx.orderItem.updateMany({
        where: {
          orderFulfillmentGroupId: group.id,
        },
        data: {
          substitutionStatus: "VENDOR_CANCELLED",
        },
      });

      await tx.orderFulfillmentGroup.update({
        where: {
          id: group.id,
        },
        data: {
          status: "CANCELLED",
          refundAmountKobo: group.items.reduce(
            (sum, item) => sum + item.lineTotalKobo,
            0,
          ),
          notes:
            input.note?.trim() ||
            `Vendor cancelled fulfillment. Released ${releasedQuantity} reserved unit(s).`,
        },
      });
    }

    const refreshedOrder = (await tx.order.findUnique({
      where: {
        id: orderId,
      },
      include: getIncludeShape(),
    })) as BackendOrderWithRelations | null;

    if (!refreshedOrder) {
      throw new Error("Order not found.");
    }

    const activeGroups = refreshedOrder.fulfillmentGroups.filter(
      (candidate) => candidate.status !== "CANCELLED",
    );
    const hasCancelledGroups = refreshedOrder.fulfillmentGroups.some(
      (candidate) => candidate.status === "CANCELLED",
    );
    const finalFrontendStatus =
      activeGroups.length === 0
        ? "cancelled"
        : aggregateOrderStatusFromGroups(activeGroups);
    const finalBackendStatus =
      finalFrontendStatus === "cancelled"
        ? "CANCELLED"
        : mapAggregatedGroupStatusToBackend(finalFrontendStatus, hasCancelledGroups);
    const cancelledAt = finalBackendStatus === "CANCELLED" ? new Date() : null;

    return (await tx.order.update({
      where: {
        id: orderId,
      },
      data: {
        status: finalBackendStatus,
        cancelledAt,
        statusEvents: {
          create: {
            status: finalBackendStatus,
            notes: buildVendorFulfillmentRuleNote(
              input.action,
              group.groupNumber,
              input.note,
            ),
          },
        },
      },
      include: getIncludeShape(),
    })) as unknown as BackendOrderWithRelations;
  });

  return buildVendorScopedOrder(updatedOrder, input.vendorId);
}
