import type { Address, Order, PaymentMethod } from "../../types";
import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../db/prisma";
import { buildCartQuote, type CartQuoteRequestItem } from "../checkout/cart-quote";
import { ensureDemoMarketplaceData } from "../dev/ensure-demo-marketplace-data";
import { getInventoryStatuses } from "../inventory/stock";
import {
  allowDevelopmentFallbacks,
  getFallbackDisabledError,
  logFallbackSuppressed,
} from "../runtime/fallback-policy";
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

function aggregateQuoteQuantities(lineItems: Array<{ productId: string; quantity: number }>) {
  const quantities = new Map<string, number>();

  lineItems.forEach((item) => {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  });

  return quantities;
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
    if (!allowDevelopmentFallbacks()) {
      throw getFallbackDisabledError();
    }

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

    const order = await prisma.$transaction(async (tx) => {
      const reservedInventoryByListingId = new Map<string, string>();
      const requestedQuantities = aggregateQuoteQuantities(quote.lineItems);

      for (const [productListingId, quantity] of requestedQuantities.entries()) {
        const inventoryRecord = await tx.inventoryRecord.findUnique({
          where: {
            productListingId,
          },
          include: {
            productListing: true,
          },
        });

        if (!inventoryRecord) {
          throw new Error("Inventory record could not be found for one or more items.");
        }

        if (inventoryRecord.availableQuantity < quantity) {
          throw new Error(
            `${inventoryRecord.productListing.title}: only ${inventoryRecord.availableQuantity} ${inventoryRecord.productListing.unitLabel} currently available.`,
          );
        }

        const reserveResult = await tx.inventoryRecord.updateMany({
          where: {
            id: inventoryRecord.id,
            availableQuantity: {
              gte: quantity,
            },
          },
          data: {
            availableQuantity: {
              decrement: quantity,
            },
            reservedQuantity: {
              increment: quantity,
            },
          },
        });

        if (reserveResult.count !== 1) {
          throw new Error(
            `${inventoryRecord.productListing.title}: stock changed before checkout could complete. Please refresh your cart.`,
          );
        }

        const nextAvailableQuantity = inventoryRecord.availableQuantity - quantity;
        const statuses = getInventoryStatuses(nextAvailableQuantity);

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
            id: productListingId,
          },
          data: {
            availabilityStatus: statuses.listingStatus,
          },
        });

        reservedInventoryByListingId.set(productListingId, inventoryRecord.id);
      }

      const createdOrder = await tx.order.create({
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

      for (const group of createdOrder.fulfillmentGroups) {
        for (const item of group.items) {
          const inventoryRecordId = reservedInventoryByListingId.get(
            item.productListingId,
          );

          if (!inventoryRecordId) {
            throw new Error("Inventory reservation could not be linked to order item.");
          }

          await tx.inventoryReservation.create({
            data: {
              inventoryRecordId,
              orderItemId: item.id,
              quantity: item.quantity,
            },
          });
        }
      }

      return createdOrder;
    });

    return {
      order: {
        ...mapBackendOrderToFrontend(order as BackendOrderRecord),
        notes: input.notes,
      },
      usedFallback: false,
    };
  } catch (error) {
    if (!allowDevelopmentFallbacks()) {
      logFallbackSuppressed("Failed to create Prisma-backed order.", error);
      throw getFallbackDisabledError();
    }

    console.error("Failed to create Prisma-backed order, using fallback order.", error);

    return {
      order: fallbackOrder,
      usedFallback: true,
    };
  }
}
