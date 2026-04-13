import type { Address, PaymentMethod } from "../../types";
import { prisma } from "../db/prisma";
import { buildCartQuote, type CartQuoteRequestItem } from "../checkout/cart-quote";

export type CreateOrderInput = {
  buyerUserId?: string;
  items: CartQuoteRequestItem[];
  deliveryAddress: Address;
  paymentMethod: PaymentMethod;
  notes?: string;
};

export type CreatedOrderSummary = {
  id: string;
  buyerId: string;
  vendorId: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  totalAmount: number;
  status: "pending";
  paymentStatus: "pending" | "processing";
  paymentMethod: PaymentMethod;
  deliveryAddress: Address;
  deliveryFee: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

type CreateOrderResult = {
  order: CreatedOrderSummary;
  usedFallback: boolean;
};

function buildOrderNumber() {
  return `EFC-${Date.now()}`;
}

export async function createOrderFromCartInput(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  const quote = await buildCartQuote({
    items: input.items,
    deliveryAddress: input.deliveryAddress,
  });

  if (!quote.isValid) {
    throw new Error(quote.errors[0] ?? "Order validation failed.");
  }

  const now = new Date();
  const fallbackOrder: CreatedOrderSummary = {
    id: `ORD-${Date.now()}`,
    buyerId: input.buyerUserId ?? "current-user-id",
    vendorId: quote.lineItems[0]?.vendorId ?? "unknown-vendor",
    items: quote.lineItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.lineTotal,
    })),
    totalAmount: quote.total,
    status: "pending",
    paymentStatus:
      input.paymentMethod === "cash-on-delivery" ? "pending" : "processing",
    paymentMethod: input.paymentMethod,
    deliveryAddress: input.deliveryAddress,
    deliveryFee: quote.deliveryFee,
    notes: input.notes,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  if (!prisma) {
    return {
      order: fallbackOrder,
      usedFallback: true,
    };
  }

  try {
    const vendorIds = [...new Set(quote.lineItems.map((item) => item.vendorId))];
    const orderNumber = buildOrderNumber();

    const order = await prisma.order.create({
      data: {
        buyerUserId: input.buyerUserId ?? "current-user-id",
        orderNumber,
        marketCode: "LAGOS",
        currencyCode: quote.currencyCode,
        subtotalAmountKobo: Math.round(quote.subtotal * 100),
        deliveryFeeAmountKobo: Math.round(quote.deliveryFee * 100),
        totalAmountKobo: Math.round(quote.total * 100),
        status: "PENDING_PAYMENT",
        paymentStatus:
          input.paymentMethod === "CASH_ON_DELIVERY" ? "PENDING" : "PROCESSING",
        buyerAddressSnapshotJson: input.deliveryAddress,
        placedAt: now,
        fulfillmentGroups: {
          create: vendorIds.map((vendorId, index) => ({
            vendorId,
            groupNumber: index + 1,
            status: "PENDING",
            subtotalAmountKobo: Math.round(
              quote.lineItems
                .filter((lineItem) => lineItem.vendorId === vendorId)
                .reduce((sum, lineItem) => sum + lineItem.lineTotal, 0) * 100,
            ),
            deliveryFeeAllocationKobo:
              index === 0 ? Math.round(quote.deliveryFee * 100) : 0,
            items: {
              create: quote.lineItems
                .filter((lineItem) => lineItem.vendorId === vendorId)
                .map((lineItem) => ({
                  productListingId: lineItem.productId,
                  productTitleSnapshot: lineItem.productName,
                  unitLabelSnapshot: lineItem.unit,
                  quantity: lineItem.quantity,
                  unitPriceKobo: Math.round(lineItem.unitPrice * 100),
                  lineTotalKobo: Math.round(lineItem.lineTotal * 100),
                })),
            },
          })),
        },
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

    return {
      order: {
        id: order.id,
        buyerId: order.buyerUserId,
        vendorId: order.fulfillmentGroups[0]?.vendorId ?? fallbackOrder.vendorId,
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
          input.paymentMethod === "cash-on-delivery" ? "pending" : "processing",
        paymentMethod: input.paymentMethod,
        deliveryAddress: input.deliveryAddress,
        deliveryFee: order.deliveryFeeAmountKobo / 100,
        notes: input.notes,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      },
      usedFallback: false,
    };
  } catch (error) {
    console.error("Failed to create Prisma-backed order, using fallback order.", error);

    return {
      order: fallbackOrder,
      usedFallback: true,
    };
  }
}
