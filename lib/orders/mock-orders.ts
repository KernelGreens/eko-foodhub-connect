import type { Order } from "../../types";

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
    deliveryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
];
