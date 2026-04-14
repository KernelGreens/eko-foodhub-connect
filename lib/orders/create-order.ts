import type { Address, Order, PaymentMethod } from "../../types";
import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../db/prisma";
import { buildCartQuote, type CartQuoteRequestItem } from "../checkout/cart-quote";
import { ensureDemoMarketplaceData } from "../dev/ensure-demo-marketplace-data";
import {
  type BackendOrderRecord,
  buildTimelineEvent,
  mapBackendOrderToFrontend,
  mapFrontendPaymentMethodToBackend,
} from "./order-view-model";

export type CreateOrderInput = {
  buyerUserId?: string;
  items: CartQuoteRequestItem[];
  deliveryAddress: Address;
  paymentMethod: PaymentMethod;
  notes?: string;
};

export type CreatedOrderSummary = Order;

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
    statusHistory: [
      buildTimelineEvent(
        "pending",
        now,
        "Order submitted and awaiting confirmation.",
      ),
    ],
    createdAt: now,
    updatedAt: now,
  };

  if (!prisma) {
    return {
      order: fallbackOrder,
      usedFallback: true,
    };
  }

  try {
    await ensureDemoMarketplaceData();

    const vendorIds = [...new Set(quote.lineItems.map((item) => item.vendorId))];
    const orderNumber = buildOrderNumber();
    const backendPaymentMethod = mapFrontendPaymentMethodToBackend(
      input.paymentMethod,
    );
    const backendPaymentStatus =
      input.paymentMethod === "cash-on-delivery" ? "PENDING" : "PROCESSING";

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
        paymentStatus: backendPaymentStatus,
        buyerAddressSnapshotJson:
          input.deliveryAddress as unknown as Prisma.InputJsonValue,
        placedAt: now,
        payments: {
          create: {
            paymentProvider: "phase1-checkout",
            paymentMethod: backendPaymentMethod,
            amountKobo: Math.round(quote.total * 100),
            currencyCode: quote.currencyCode,
            status: backendPaymentStatus,
          },
        },
        statusEvents: {
          create: {
            status: "PENDING_PAYMENT",
            notes: "Order submitted and awaiting confirmation.",
          },
        },
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
      order: {
        ...mapBackendOrderToFrontend(order as BackendOrderRecord),
        notes: input.notes,
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
