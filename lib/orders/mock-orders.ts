import type { Order } from "../../types";

import { buildTimelineEvent } from "./order-view-model";

const createdAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
const deliveredAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

export const mockOrders: Order[] = [
  {
    id: "ORD-1703123456789",
    buyerId: "current-user-id",
    vendorId: "1",
    items: [
      {
        productId: "1",
        quantity: 10,
        unitPrice: 800,
        totalPrice: 8000,
      },
    ],
    totalAmount: 8500,
    status: "delivered",
    paymentStatus: "completed",
    paymentMethod: "momo",
    deliveryAddress: {
      street: "123 Main Street",
      area: "Ikeja",
      lga: "Ikeja",
      state: "Lagos",
      landmark: "Near Computer Village",
    },
    deliveryFee: 500,
    deliveryDate: deliveredAt,
    statusHistory: [
      buildTimelineEvent("pending", createdAt, "Order submitted successfully."),
      buildTimelineEvent("confirmed", new Date(createdAt.getTime() + 2 * 60 * 60 * 1000)),
      buildTimelineEvent("preparing", new Date(createdAt.getTime() + 10 * 60 * 60 * 1000)),
      buildTimelineEvent("in-transit", new Date(deliveredAt.getTime() - 3 * 60 * 60 * 1000)),
      buildTimelineEvent("delivered", deliveredAt),
    ],
    createdAt,
    updatedAt: deliveredAt,
  },
];
