import type { Order } from "../../types";
import { prisma } from "../db/prisma";
import { mockOrders } from "./mock-orders";
import { mapBackendOrderToFrontend } from "./order-view-model";

export async function getBuyerOrders(
  buyerUserId = "current-user-id",
): Promise<Order[]> {
  if (!prisma) {
    return mockOrders;
  }

  try {
    const orders = await prisma.order.findMany({
      where: {
        buyerUserId,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    if (orders.length === 0) {
      return mockOrders;
    }

    return orders.map(mapBackendOrderToFrontend);
  } catch (error) {
    console.error("Failed to read buyer orders from Prisma, using mock fallback.", error);
    return mockOrders;
  }
}

export async function getBuyerOrderById(
  orderId: string,
  buyerUserId = "current-user-id",
): Promise<Order | null> {
  if (!prisma) {
    return mockOrders.find((order) => order.id === orderId) ?? null;
  }

  try {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        buyerUserId,
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

    if (!order) {
      return mockOrders.find((candidate) => candidate.id === orderId) ?? null;
    }

    return mapBackendOrderToFrontend(order);
  } catch (error) {
    console.error("Failed to read buyer order detail from Prisma, using mock fallback.", error);
    return mockOrders.find((candidate) => candidate.id === orderId) ?? null;
  }
}
