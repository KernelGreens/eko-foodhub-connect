import type { PaymentMethod, PaymentStatus } from "../../types";

export function getPaymentMethodLabel(method: PaymentMethod) {
  switch (method) {
    case "bank-transfer":
      return "Bank transfer";
    case "card":
      return "Debit/Credit card";
    case "ussd":
      return "USSD";
    case "cash-on-delivery":
      return "Cash on delivery";
    case "momo":
    default:
      return "Mobile money";
  }
}

export function getPaymentModeCopy(method: PaymentMethod) {
  if (method === "cash-on-delivery") {
    return {
      label: "Pending COD",
      description:
        "Cash collection is handled at delivery. No online payment is collected in this test build.",
    };
  }

  return {
    label: "Simulated test payment",
    description:
      "This test build records the payment choice only. No real card, transfer, USSD, or mobile money charge is made.",
  };
}

export function getPaymentStatusLabel(
  status: PaymentStatus,
  method: PaymentMethod,
) {
  if (status === "cancelled") {
    return "Cancelled";
  }

  if (status === "failed") {
    return "Failed";
  }

  if (status === "refunded") {
    return "Refunded";
  }

  if (status === "completed") {
    return "Completed";
  }

  return getPaymentModeCopy(method).label;
}

export function getFulfillmentPaymentPolicyCopy(method: PaymentMethod) {
  if (method === "cash-on-delivery") {
    return "Fulfillment is allowed for controlled testing under COD rules.";
  }

  return "Fulfillment is allowed for controlled testing while payment provider integration is pending.";
}
