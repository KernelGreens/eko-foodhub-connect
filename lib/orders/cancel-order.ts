import type { Order } from "../../types";

import { prisma } from "../db/prisma";
import { mockOrders } from "./mock-orders";
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

export async function cancelBuyerOrder(
  orderId: string,
  input: CancelOrderInput = {},
): Promise<CancelOrderResult> {
  const reason = input.reason?.trim() || "Order cancelled by buyer.";

  if (!prisma) {
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
          items: true,
        },
        orderBy: {
          groupNumber: "asc",
        },
      },
    },
  });

  if (!existingOrder) {
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

  const updatedOrder = await prisma.order.update({
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

  return {
    order: mapBackendOrderToFrontend(updatedOrder),
    usedFallback: false,
  };
}
