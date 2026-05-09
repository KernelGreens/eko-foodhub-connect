import type { Address, Product } from "../../types";
import { prisma } from "../db/prisma";
import {
  allowDevelopmentFallbacks,
  getFallbackDisabledError,
  logFallbackSuppressed,
} from "../runtime/fallback-policy";
import { mockProducts } from "../catalog/mock-products";

export type CartQuoteRequestItem = {
  productId: string;
  quantity: number;
};

export type CartQuoteRequest = {
  items: CartQuoteRequestItem[];
  deliveryAddress: Address;
};

export type CartQuoteLineItem = {
  productId: string;
  productName: string;
  vendorId: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
  appliedBulkTier?: {
    minQuantity: number;
    price: number;
    discount: number;
  };
};

export type CartQuote = {
  isValid: boolean;
  errors: string[];
  coverageAvailable: boolean;
  subtotal: number;
  deliveryFee: number;
  total: number;
  currencyCode: string;
  deliveryEstimate: string;
  lineItems: CartQuoteLineItem[];
};

const lagosDeliveryFees: Record<string, number> = {
  agege: 750,
  "ajeromi-ifelodun": 700,
  alimosho: 700,
  "amuwo-odofin": 700,
  apapa: 800,
  badagry: 1200,
  epe: 1400,
  "eti-osa": 850,
  "ibeju-lekki": 1300,
  "ifako-ijaiye": 700,
  ikeja: 600,
  ikorodu: 1100,
  kosofe: 650,
  "lagos-island": 800,
  "lagos-mainland": 700,
  mushin: 500,
  ojo: 950,
  "oshodi-isolo": 600,
  shomolu: 600,
  surulere: 550,
};

function normalizeLga(input: string) {
  return input.trim().toLowerCase().replace(/\s+/g, "-");
}

function getAppliedBulkTier(product: Product, quantity: number) {
  const sortedTiers = [...(product.bulkPricing ?? [])].sort(
    (a, b) => b.minQuantity - a.minQuantity,
  );

  return sortedTiers.find((tier) => quantity >= tier.minQuantity);
}

function calculateDeliveryFee(address: Address, products: Product[], items: CartQuoteRequestItem[]) {
  const baseFee = lagosDeliveryFees[normalizeLga(address.lga)] ?? 0;
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  const heavyItemCount = items.filter((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return product?.unit === "kg" && item.quantity >= 20;
  }).length;

  return baseFee + totalUnits * 5 + heavyItemCount * 150;
}

async function loadProductsForQuote(productIds: string[]) {
  if (!prisma) {
    if (!allowDevelopmentFallbacks()) {
      throw getFallbackDisabledError();
    }

    return mockProducts.filter((product) => productIds.includes(product.id));
  }

  try {
    const listings = await prisma.productListing.findMany({
      where: {
        id: {
          in: productIds,
        },
        publishStatus: "PUBLISHED",
      },
      include: {
        product: {
          include: {
            category: true,
            images: {
              orderBy: {
                sortOrder: "asc",
              },
            },
          },
        },
        bulkPricingTiers: {
          orderBy: {
            minimumQuantity: "asc",
          },
        },
        inventoryRecord: true,
      },
    });

    if (listings.length === 0) {
      if (!allowDevelopmentFallbacks()) {
        return [];
      }

      return mockProducts.filter((product) => productIds.includes(product.id));
    }

    return listings.map((listing) => {
      const categoryKey = listing.product.category.key;

      return {
        id: listing.id,
        vendorId: listing.vendorId,
        name: listing.title,
        category:
          categoryKey === "fruits" ||
          categoryKey === "vegetables" ||
          categoryKey === "grains" ||
          categoryKey === "tubers" ||
          categoryKey === "meat" ||
          categoryKey === "fish" ||
          categoryKey === "dairy" ||
          categoryKey === "spices" ||
          categoryKey === "herbs"
            ? categoryKey
            : "processed",
        description: listing.description ?? listing.product.description ?? "",
        images: listing.product.images.map((image) => image.storageKey),
        price: listing.basePriceKobo / 100,
        unit: listing.unitLabel,
        stock: listing.inventoryRecord?.availableQuantity ?? 0,
        minOrder: listing.minimumOrderQuantity,
        maxOrder: listing.maximumOrderQuantity ?? undefined,
        bulkPricing: listing.bulkPricingTiers.map((tier) => ({
          minQuantity: tier.minimumQuantity,
          price: tier.unitPriceKobo / 100,
          discount:
            listing.basePriceKobo > 0
              ? Number(
                  (
                    ((listing.basePriceKobo - tier.unitPriceKobo) /
                      listing.basePriceKobo) *
                    100
                  ).toFixed(2),
                )
              : 0,
        })),
        freshness:
          listing.freshnessGrade === "VERY_FRESH"
            ? "very-fresh"
            : listing.freshnessGrade === "PREMIUM"
              ? "premium"
              : "fresh",
        isOrganic: listing.isOrganic,
        isAvailable:
          listing.availabilityStatus !== "OUT_OF_STOCK" &&
          (listing.inventoryRecord?.availableQuantity ?? 0) > 0,
        tags: [categoryKey, listing.availabilityStatus.toLowerCase()],
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt,
      } satisfies Product;
    });
  } catch (error) {
    if (!allowDevelopmentFallbacks()) {
      logFallbackSuppressed("Failed to load quote products from Prisma.", error);
      throw getFallbackDisabledError();
    }

    console.error("Failed to load quote products from Prisma, using mock fallback.", error);

    return mockProducts.filter((product) => productIds.includes(product.id));
  }
}

export async function buildCartQuote({
  items,
  deliveryAddress,
}: CartQuoteRequest): Promise<CartQuote> {
  const errors: string[] = [];
  const uniqueProductIds = [...new Set(items.map((item) => item.productId))];
  const products = await loadProductsForQuote(uniqueProductIds);
  const lineItems: CartQuoteLineItem[] = [];

  items.forEach((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);

    if (!product) {
      errors.push(`Product ${item.productId} is unavailable.`);
      return;
    }

    if (!product.isAvailable || product.stock <= 0) {
      errors.push(`${product.name} is currently unavailable.`);
    }

    if (item.quantity < product.minOrder) {
      errors.push(
        `${product.name}: minimum order is ${product.minOrder} ${product.unit}.`,
      );
    }

    if (product.maxOrder && item.quantity > product.maxOrder) {
      errors.push(
        `${product.name}: maximum order is ${product.maxOrder} ${product.unit}.`,
      );
    }

    if (item.quantity > product.stock) {
      errors.push(
        `${product.name}: only ${product.stock} ${product.unit} currently available.`,
      );
    }

    const appliedBulkTier = getAppliedBulkTier(product, item.quantity);
    const unitPrice = appliedBulkTier?.price ?? product.price;
    const lineTotal = unitPrice * item.quantity;

    lineItems.push({
      productId: product.id,
      productName: product.name,
      vendorId: product.vendorId,
      quantity: item.quantity,
      unit: product.unit,
      unitPrice,
      lineTotal,
      appliedBulkTier,
    });
  });

  const hasRequiredAddress =
    Boolean(deliveryAddress.street.trim()) &&
    Boolean(deliveryAddress.area.trim()) &&
    Boolean(deliveryAddress.lga.trim()) &&
    deliveryAddress.state.trim().toLowerCase() === "lagos";

  const coverageAvailable =
    hasRequiredAddress && normalizeLga(deliveryAddress.lga) in lagosDeliveryFees;

  if (!deliveryAddress.street.trim()) {
    errors.push("Street address is required.");
  }

  if (!deliveryAddress.area.trim()) {
    errors.push("Area is required.");
  }

  if (!deliveryAddress.lga.trim()) {
    errors.push("LGA is required.");
  }

  if (deliveryAddress.state.trim() && deliveryAddress.state.trim().toLowerCase() !== "lagos") {
    errors.push("Phase 1 delivery is limited to Lagos State.");
  }

  if (
    deliveryAddress.lga.trim() &&
    deliveryAddress.state.trim().toLowerCase() === "lagos" &&
    !coverageAvailable
  ) {
    errors.push("This delivery area is not yet supported in Phase 1.");
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const deliveryFee = coverageAvailable
    ? calculateDeliveryFee(deliveryAddress, products, items)
    : 0;
  const total = subtotal + deliveryFee;

  return {
    isValid: errors.length === 0,
    errors,
    coverageAvailable,
    subtotal,
    deliveryFee,
    total,
    currencyCode: "NGN",
    deliveryEstimate: coverageAvailable
      ? "Scheduled Lagos delivery available via FoodHub logistics"
      : "Enter a valid Lagos delivery address to confirm delivery availability",
    lineItems,
  };
}
