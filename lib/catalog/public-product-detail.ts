import type { Product } from "../../types";
import { prisma } from "../db/prisma";
import { mockProducts } from "./mock-products";

export type PublicProductDetail = {
  product: Product;
  vendorName: string;
  deliveryEstimate: string;
  hubName?: string;
};

function hydrateMockProduct(product: Product): Product {
  return {
    ...product,
    createdAt: new Date(product.createdAt),
    updatedAt: new Date(product.updatedAt),
    harvestDate: product.harvestDate ? new Date(product.harvestDate) : undefined,
    expiryDate: product.expiryDate ? new Date(product.expiryDate) : undefined,
  };
}

function getMockProductDetail(productId: string): PublicProductDetail | null {
  const product = mockProducts.find((item) => item.id === productId);

  if (!product) {
    return null;
  }

  return {
    product: hydrateMockProduct(product),
    vendorName: "Verified FoodHub Vendor",
    deliveryEstimate: "Scheduled Lagos delivery available",
    hubName: "Lagos FoodHub",
  };
}

export async function getPublicProductDetail(
  productId: string,
): Promise<PublicProductDetail | null> {
  if (!prisma) {
    return getMockProductDetail(productId);
  }

  try {
    const listing = await prisma.productListing.findFirst({
      where: {
        id: productId,
        publishStatus: "PUBLISHED",
      },
      include: {
        vendor: true,
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

    if (!listing) {
      return getMockProductDetail(productId);
    }

    const categoryKey = listing.product.category.key;
    const images = listing.product.images.map((image) => image.storageKey);
    const stock = listing.inventoryRecord?.availableQuantity ?? 0;

    return {
      product: {
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
        images:
          images.length > 0
            ? images
            : ["https://images.pexels.com/photos/533280/pexels-photo-533280.jpeg"],
        price: listing.basePriceKobo / 100,
        unit: listing.unitLabel,
        stock,
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
          listing.availabilityStatus !== "OUT_OF_STOCK" && stock > 0,
        tags: [categoryKey, listing.availabilityStatus.toLowerCase()],
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt,
      },
      vendorName: listing.vendor.displayName,
      deliveryEstimate: "Scheduled Lagos delivery available via FoodHub logistics",
      hubName: undefined,
    };
  } catch (error) {
    console.error(
      "Failed to load product detail from Prisma, using mock fallback.",
      error,
    );

    return getMockProductDetail(productId);
  }
}
