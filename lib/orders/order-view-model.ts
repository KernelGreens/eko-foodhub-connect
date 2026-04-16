import type {
  Order,
  OrderStatus,
  OrderTimelineEvent,
  PaymentMethod,
  PaymentStatus,
} from "../../types";

export type BackendOrderRecord = {
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
    vendorId: string;
    items: Array<{
      productListingId: string;
      quantity: number;
      unitPriceKobo: number;
      lineTotalKobo: number;
    }>;
    deliveryJobs?: Array<{
      id: string;
      status: string;
      assignedToUserId: string | null;
      dispatchBatch?: {
        id: string;
        batchCode: string;
        status: string;
      } | null;
      assignedTo?: {
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

type BackendPaymentMethod =
  | "BANK_TRANSFER"
  | "CARD"
  | "USSD"
  | "CASH_ON_DELIVERY"
  | "MOBILE_MONEY";

export function mapBackendOrderStatusToFrontend(status: string): OrderStatus {
  switch (status) {
    case "PLACED":
    case "ACCEPTED":
      return "confirmed";
    case "PREPARING":
    case "PARTIALLY_READY":
      return "preparing";
    case "READY_FOR_LOGISTICS":
      return "ready";
    case "OUT_FOR_DELIVERY":
    case "FAILED_DELIVERY":
      return "in-transit";
    case "DELIVERED":
    case "PARTIALLY_REFUNDED":
    case "REFUNDED":
      return "delivered";
    case "CANCELLED":
      return "cancelled";
    case "PENDING_PAYMENT":
    default:
      return "pending";
  }
}

export function mapBackendPaymentStatusToFrontend(status: string): PaymentStatus {
  switch (status) {
    case "PROCESSING":
      return "processing";
    case "SUCCEEDED":
      return "completed";
    case "FAILED":
      return "failed";
    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
      return "refunded";
    case "CANCELLED":
      return "cancelled";
    case "INITIATED":
    case "PENDING":
    default:
      return "pending";
  }
}

export function mapBackendPaymentMethodToFrontend(
  method: string | null | undefined,
): PaymentMethod {
  switch (method) {
    case "BANK_TRANSFER":
      return "bank-transfer";
    case "CARD":
      return "card";
    case "USSD":
      return "ussd";
    case "CASH_ON_DELIVERY":
      return "cash-on-delivery";
    case "MOBILE_MONEY":
    default:
      return "momo";
  }
}

export function mapFrontendPaymentMethodToBackend(
  method: PaymentMethod,
): BackendPaymentMethod {
  switch (method) {
    case "bank-transfer":
      return "BANK_TRANSFER";
    case "card":
      return "CARD";
    case "ussd":
      return "USSD";
    case "cash-on-delivery":
      return "CASH_ON_DELIVERY";
    case "momo":
    default:
      return "MOBILE_MONEY";
  }
}

export function getOrderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "pending":
      return "Order received";
    case "confirmed":
      return "Order confirmed";
    case "preparing":
      return "Vendor preparing items";
    case "ready":
      return "Ready for logistics";
    case "in-transit":
      return "Out for delivery";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Order cancelled";
    default:
      return "Order update";
  }
}

export function getAllowedNextOrderStatuses(
  status: OrderStatus,
): OrderStatus[] {
  switch (status) {
    case "pending":
      return ["confirmed", "cancelled"];
    case "confirmed":
      return ["preparing", "cancelled"];
    case "preparing":
      return ["ready", "cancelled"];
    case "ready":
      return ["in-transit", "cancelled"];
    case "in-transit":
      return ["delivered"];
    case "delivered":
    case "cancelled":
    default:
      return [];
  }
}

export function isAllowedOrderStatusTransition(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
) {
  return getAllowedNextOrderStatuses(currentStatus).includes(nextStatus);
}

export function isFrontendOrderCancelable(status: OrderStatus): boolean {
  return status === "pending";
}

export function buildTimelineEvent(
  status: OrderStatus,
  createdAt: Date,
  note?: string,
  id?: string,
): OrderTimelineEvent {
  return {
    id: id ?? `${status}-${createdAt.getTime()}`,
    status,
    label: getOrderStatusLabel(status),
    note,
    createdAt,
  };
}

function buildDeliveryException(
  events: NonNullable<BackendOrderRecord["statusEvents"]>,
): Order["deliveryException"] | undefined {
  const relevantEvents = [...events]
    .filter((event) => {
      const note = event.notes?.toLowerCase() ?? "";
      return (
        note.includes("delivery exception") ||
        note.includes("reassigned") && note.includes("delivery exception")
      );
    })
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

  const latestEvent = relevantEvents[0];

  if (!latestEvent?.notes) {
    return undefined;
  }

  const normalizedNote = latestEvent.notes.toLowerCase();

  return {
    state: normalizedNote.includes("reassigned") ? "recovering" : "reported",
    message: latestEvent.notes,
    reportedAt: latestEvent.createdAt,
  };
}

export function buildFallbackStatusHistory(
  status: OrderStatus,
  createdAt: Date,
  updatedAt: Date,
  cancelledAt?: Date | null,
): OrderTimelineEvent[] {
  const baseEvent = buildTimelineEvent(status, createdAt);

  if (status !== "cancelled") {
    return [baseEvent];
  }

  return [
    buildTimelineEvent("pending", createdAt),
    buildTimelineEvent(
      "cancelled",
      cancelledAt ?? updatedAt,
      "Order cancelled by buyer.",
    ),
  ];
}

export function cancelFrontendOrder(
  order: Order,
  reason = "Order cancelled by buyer.",
  cancelledAt = new Date(),
): Order {
  const nextPaymentStatus: PaymentStatus =
    order.paymentStatus === "completed" ? "refunded" : "cancelled";

  return {
    ...order,
    status: "cancelled",
    paymentStatus: nextPaymentStatus,
    cancelledAt,
    updatedAt: cancelledAt,
    statusHistory: [
      ...(order.statusHistory ?? buildFallbackStatusHistory(order.status, order.createdAt, order.updatedAt, order.cancelledAt)),
      buildTimelineEvent("cancelled", cancelledAt, reason),
    ],
  };
}

export function mapBackendOrderToFrontend(order: BackendOrderRecord): Order {
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

  const frontendStatus = mapBackendOrderStatusToFrontend(order.status);
  const deliveryJobs = order.fulfillmentGroups.flatMap(
    (group) => group.deliveryJobs ?? [],
  );
  const primaryDeliveryJob = deliveryJobs[0];
  const latestProof = deliveryJobs
    .flatMap((job) => job.proofOfDelivery ?? [])
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
  const paymentMethod = mapBackendPaymentMethodToFrontend(
    order.payments?.[0]?.paymentMethod,
  );
  const statusHistory =
    order.statusEvents && order.statusEvents.length > 0
      ? order.statusEvents.map((event) =>
          buildTimelineEvent(
            mapBackendOrderStatusToFrontend(event.status),
            event.createdAt,
            event.notes ?? undefined,
            event.id,
          ),
        )
      : buildFallbackStatusHistory(
          frontendStatus,
          order.createdAt,
          order.updatedAt,
          order.cancelledAt,
        );
  const deliveryException =
    order.statusEvents && order.statusEvents.length > 0
      ? buildDeliveryException(order.statusEvents)
      : undefined;

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
    status: frontendStatus,
    paymentStatus: mapBackendPaymentStatusToFrontend(order.paymentStatus),
    paymentMethod,
    deliveryAddress: deliveryAddress as Order["deliveryAddress"],
    deliveryFee: order.deliveryFeeAmountKobo / 100,
    cancelledAt: order.cancelledAt ?? undefined,
    statusHistory,
    deliveryException,
    logisticsAssignment: primaryDeliveryJob
      ? {
          operatorId: primaryDeliveryJob.assignedToUserId ?? undefined,
          operatorName: primaryDeliveryJob.assignedTo?.displayName ?? undefined,
          deliveryStatus: primaryDeliveryJob.status
            ? mapBackendDeliveryStatusToFrontend(primaryDeliveryJob.status)
            : undefined,
          assignedFulfillmentGroups: deliveryJobs.length,
          dispatchBatchCode:
            primaryDeliveryJob.dispatchBatch?.batchCode ??
            buildDispatchBatchCode(order.id, deliveryJobs),
          proofOfDelivery: latestProof
            ? {
                proofType: mapBackendProofTypeToFrontend(latestProof.proofType),
                proofValue: latestProof.proofValue ?? undefined,
                proofUrl: latestProof.storageKey ?? undefined,
                createdAt: latestProof.createdAt,
              }
            : undefined,
        }
      : undefined,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

function buildDispatchBatchCode(
  orderId: string,
  deliveryJobs: Array<{ id: string }>,
) {
  if (deliveryJobs.length === 0) {
    return undefined;
  }

  return `DB-${orderId.slice(-6).toUpperCase()}-${deliveryJobs.length}`;
}

function mapBackendProofTypeToFrontend(
  proofType: string,
): NonNullable<NonNullable<Order["logisticsAssignment"]>["proofOfDelivery"]>["proofType"] {
  switch (proofType) {
    case "PHOTO":
      return "photo";
    case "SIGNATURE":
      return "signature";
    case "OTP":
      return "otp";
    case "MANUAL_CONFIRMATION":
    default:
      return "manual-confirmation";
  }
}

function mapBackendDeliveryStatusToFrontend(
  status: string,
): NonNullable<Order["logisticsAssignment"]>["deliveryStatus"] {
  switch (status) {
    case "ASSIGNED":
      return "assigned";
    case "PICKED_UP":
      return "picked-up";
    case "OUT_FOR_DELIVERY":
      return "out-for-delivery";
    case "DELIVERED":
      return "delivered";
    case "FAILED":
      return "failed";
    case "CANCELLED":
      return "cancelled";
    case "PENDING_ASSIGNMENT":
    default:
      return "pending-assignment";
  }
}
