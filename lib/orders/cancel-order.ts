import type { Order } from "../../types";

import { prisma } from "../db/prisma";
import { mockOrders } from "./mock-orders";
import { getInventoryStatuses } from "../inventory/stock";
import { allowDevelopmentFallbacks } from "../runtime/fallback-policy";
import {
  cancelFrontendOrder,
  isFrontendOrderCancelable,
  mapBackendOrderToFrontend,
} from "./order-view-model";

type CancelOrderInput = {
  buyerUserId?: string;
  reason?: string;
};

type CancelOrderResult = {
  order: Order;
  usedFallback: boolean;
};

type InventoryReservationForRelease = {
  id: string;
  inventoryRecordId: string;
  quantity: number;
};

function groupReservationsByInventoryRecord(
  reservations: InventoryReservationForRelease[],
) {
  const grouped = new Map<string, { quantity: number; reservationIds: string[] }>();

  reservations.forEach((reservation) => {
    const current = grouped.get(reservation.inventoryRecordId) ?? {
      quantity: 0,
      reservationIds: [],
    };

    current.quantity += reservation.quantity;
    current.reservationIds.push(reservation.id);
    grouped.set(reservation.inventoryRecordId, current);
  });

  return grouped;
}

export async function cancelBuyerOrder(
  orderId: string,
  input: CancelOrderInput = {},
): Promise<CancelOrderResult> {
  const reason = input.reason?.trim() || "Order cancelled by buyer.";
  const shouldUseMockFallback =
    allowDevelopmentFallbacks() &&
    (input.buyerUserId ?? "current-user-id") === "current-user-id";

  if (!prisma) {
    if (!shouldUseMockFallback) {
      throw new Error("Order cancellation is unavailable right now.");
    }

    const fallbackOrder = mockOrders.find((order) => order.id === orderId);

    if (!fallbackOrder) {
      throw new Error("Order not found.");
    }

    if (!isFrontendOrderCancelable(fallbackOrder.status)) {
      throw new Error("This order can no longer be cancelled.");
    }

    return {
      order: cancelFrontendOrder(fallbackOrder, reason),
      usedFallback: true,
    };
  }

  const existingOrder = await prisma.order.findFirst({
    where: {
      id: orderId,
      buyerUserId: input.buyerUserId ?? "current-user-id",
    },
    include: {
      payments: {
        orderBy: {
          createdAt: "asc",
        },
      },
      statusEvents: {
        orderBy: {
          createdAt: "asc",
        },
      },
      fulfillmentGroups: {
        include: {
          items: {
            include: {
              inventoryReservations: true,
            },
          },
        },
        orderBy: {
          groupNumber: "asc",
        },
      },
    },
  });

  if (!existingOrder) {
    if (!shouldUseMockFallback) {
      throw new Error("Order not found.");
    }

    const mockOrder = mockOrders.find((order) => order.id === orderId);

    if (!mockOrder) {
      throw new Error("Order not found.");
    }

    if (!isFrontendOrderCancelable(mockOrder.status)) {
      throw new Error("This order can no longer be cancelled.");
    }

    return {
      order: cancelFrontendOrder(mockOrder, reason),
      usedFallback: true,
    };
  }

  const frontendOrder = mapBackendOrderToFrontend(existingOrder);

  if (!isFrontendOrderCancelable(frontendOrder.status)) {
    throw new Error("This order can no longer be cancelled.");
  }

  const cancelledAt = new Date();
  const nextPaymentStatus =
    existingOrder.paymentStatus === "SUCCEEDED" ? "REFUNDED" : "CANCELLED";
  const reservationsToRelease = existingOrder.fulfillmentGroups.flatMap((group) =>
    group.items.flatMap((item) => item.inventoryReservations),
  );
  const reservationsByInventoryRecord = groupReservationsByInventoryRecord(
    reservationsToRelease,
  );

  const updatedOrder = await prisma.$transaction(async (tx) => {
    for (const [inventoryRecordId, release] of reservationsByInventoryRecord) {
      const inventoryRecord = await tx.inventoryRecord.update({
        where: {
          id: inventoryRecordId,
        },
        data: {
          availableQuantity: {
            increment: release.quantity,
          },
          reservedQuantity: {
            decrement: release.quantity,
          },
        },
      });
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

      await tx.inventoryReservation.deleteMany({
        where: {
          id: {
            in: release.reservationIds,
          },
        },
      });
    }

    return tx.order.update({
      where: {
        id: existingOrder.id,
      },
      data: {
        status: "CANCELLED",
        paymentStatus: nextPaymentStatus,
        cancelledAt,
        statusEvents: {
          create: {
            status: "CANCELLED",
            notes: reason,
          },
        },
        fulfillmentGroups: {
          updateMany: {
            where: {},
            data: {
              status: "CANCELLED",
            },
          },
        },
        payments: {
          updateMany: {
            where: {
              status: {
                in: ["INITIATED", "PENDING", "PROCESSING"],
              },
            },
            data: {
              status: nextPaymentStatus,
            },
          },
        },
      },
      include: {
        payments: {
          orderBy: {
            createdAt: "asc",
          },
        },
        statusEvents: {
          orderBy: {
            createdAt: "asc",
          },
        },
        fulfillmentGroups: {
          include: {
            items: true,
          },
          orderBy: {
            groupNumber: "asc",
          },
        },
      },
    });
  });

  return {
    order: mapBackendOrderToFrontend(updatedOrder),
    usedFallback: false,
  };
}
