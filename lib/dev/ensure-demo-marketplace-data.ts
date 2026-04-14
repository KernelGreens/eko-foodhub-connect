import type { FreshnessGrade, ListingAvailabilityStatus } from "../generated/prisma/enums";

import { mockProducts } from "../catalog/mock-products";
import { prisma } from "../db/prisma";

const DEMO_VENDOR_ID = "1";

function toTitleCase(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function mapFreshnessGrade(
  freshness: "fresh" | "very-fresh" | "premium",
): FreshnessGrade {
  switch (freshness) {
    case "very-fresh":
      return "VERY_FRESH";
    case "premium":
      return "PREMIUM";
    case "fresh":
    default:
      return "FRESH";
  }
}

function mapAvailabilityStatus(stock: number): ListingAvailabilityStatus {
  if (stock <= 0) {
    return "OUT_OF_STOCK";
  }

  if (stock <= 20) {
    return "LOW_STOCK";
  }

  return "IN_STOCK";
}

export async function ensureDemoMarketplaceData() {
  if (!prisma || process.env.NODE_ENV === "production") {
    return;
  }

  await prisma.vendor.upsert({
    where: {
      id: DEMO_VENDOR_ID,
    },
    update: {
      displayName: "Adebayo Fresh Farms",
      legalName: "Adebayo Fresh Farms",
      applicationStatus: "APPROVED",
      verificationStatus: "APPROVED",
    },
    create: {
      id: DEMO_VENDOR_ID,
      displayName: "Adebayo Fresh Farms",
      legalName: "Adebayo Fresh Farms",
      applicationStatus: "APPROVED",
      verificationStatus: "APPROVED",
    },
  });

  for (const product of mockProducts) {
    const categoryId = `demo-category-${product.category}`;
    const productId = `demo-product-${product.id}`;
    const imageId = `demo-image-${product.id}`;

    await prisma.productCategory.upsert({
      where: {
        key: product.category,
      },
      update: {
        name: toTitleCase(product.category),
      },
      create: {
        id: categoryId,
        key: product.category,
        name: toTitleCase(product.category),
      },
    });

    await prisma.product.upsert({
      where: {
        id: productId,
      },
      update: {
        categoryId,
        canonicalName: product.name,
        description: product.description,
      },
      create: {
        id: productId,
        categoryId,
        canonicalName: product.name,
        description: product.description,
      },
    });

    if (product.images[0]) {
      await prisma.productImage.upsert({
        where: {
          id: imageId,
        },
        update: {
          productId,
          storageKey: product.images[0],
          altText: product.name,
          sortOrder: 0,
        },
        create: {
          id: imageId,
          productId,
          storageKey: product.images[0],
          altText: product.name,
          sortOrder: 0,
        },
      });
    }

    await prisma.productListing.upsert({
      where: {
        id: product.id,
      },
      update: {
        vendorId: DEMO_VENDOR_ID,
        productId,
        title: product.name,
        description: product.description,
        unitLabel: product.unit,
        minimumOrderQuantity: product.minOrder,
        maximumOrderQuantity: product.maxOrder ?? null,
        basePriceKobo: Math.round(product.price * 100),
        availabilityStatus: mapAvailabilityStatus(product.stock),
        publishStatus: "PUBLISHED",
        freshnessGrade: mapFreshnessGrade(product.freshness),
        isOrganic: product.isOrganic,
        publishedAt: new Date(),
      },
      create: {
        id: product.id,
        vendorId: DEMO_VENDOR_ID,
        productId,
        title: product.name,
        description: product.description,
        unitLabel: product.unit,
        minimumOrderQuantity: product.minOrder,
        maximumOrderQuantity: product.maxOrder ?? null,
        basePriceKobo: Math.round(product.price * 100),
        availabilityStatus: mapAvailabilityStatus(product.stock),
        publishStatus: "PUBLISHED",
        freshnessGrade: mapFreshnessGrade(product.freshness),
        isOrganic: product.isOrganic,
        publishedAt: new Date(),
      },
    });

    await prisma.inventoryRecord.upsert({
      where: {
        productListingId: product.id,
      },
      update: {
        availableQuantity: product.stock,
        stockStatus:
          product.stock <= 0
            ? "OUT_OF_STOCK"
            : product.stock <= 20
              ? "LOW_STOCK"
              : "IN_STOCK",
      },
      create: {
        productListingId: product.id,
        availableQuantity: product.stock,
        stockStatus:
          product.stock <= 0
            ? "OUT_OF_STOCK"
            : product.stock <= 20
              ? "LOW_STOCK"
              : "IN_STOCK",
      },
    });

    for (const tier of product.bulkPricing ?? []) {
      const tierId = `demo-bulk-${product.id}-${tier.minQuantity}`;

      await prisma.bulkPricingTier.upsert({
        where: {
          id: tierId,
        },
        update: {
          productListingId: product.id,
          minimumQuantity: tier.minQuantity,
          unitPriceKobo: Math.round(tier.price * 100),
        },
        create: {
          id: tierId,
          productListingId: product.id,
          minimumQuantity: tier.minQuantity,
          unitPriceKobo: Math.round(tier.price * 100),
        },
      });
    }
  }
}
