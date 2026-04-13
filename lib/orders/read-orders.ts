import type { Order } from "../../types";
import { prisma } from "../db/prisma";
import { mockOrders } from "./mock-orders";

function mapBackendOrderToFrontend(order: {
  id: string;
  buyerUserId: string;
  totalAmountKobo: number;
  deliveryFeeAmountKobo: number;
  paymentStatus: string;
  createdAt: Date;
  updatedAt: Date;
  buyerAddressSnapshotJson: unknown;
  fulfillmentGroups: Array<{
    vendorId: string;
    items: Array<{
      productListingId: string;
      quantity: number;
      unitPriceKobo: number;
      lineTotalKobo: number;
    }>;
  }>;
}): Order {
  const deliveryAddress =
    typeof order.buyerAddressSnapshotJson === "object" &&
    order.buyerAddressSnapshotJson !== null
      ? order.buyerAddressSnapshotJson
      : {
          street: "",
          area: "",
          lga: "",
          state: "Lagos",
        };

  return {
    id: order.id,
    buyerId: order.buyerUserId,
    vendorId: order.fulfillmentGroups[0]?.vendorId ?? "unknown-vendor",
    items: order.fulfillmentGroups.flatMap((group) =>
      group.items.map((item) => ({
        productId: item.productListingId,
        quantity: item.quantity,
        unitPrice: item.unitPriceKobo / 100,
        totalPrice: item.lineTotalKobo / 100,
      })),
    ),
    totalAmount: order.totalAmountKobo / 100,
    status: "pending",
    paymentStatus:
      order.paymentStatus === "PENDING"
        ? "pending"
        : order.paymentStatus === "PROCESSING"
          ? "processing"
          : order.paymentStatus === "REFUNDED"
            ? "refunded"
            : "completed",
    paymentMethod: "card",
    deliveryAddress: deliveryAddress as Order["deliveryAddress"],
    deliveryFee: order.deliveryFeeAmountKobo / 100,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

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
