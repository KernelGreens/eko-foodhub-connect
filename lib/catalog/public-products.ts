import type { Product, ProductCategory } from "../../types";
import { prisma } from "../db/prisma";
import { mockProducts } from "./mock-products";

type ProductSearchParams = {
  q?: string;
  category?: string;
  vendorId?: string;
};

const validCategories = new Set<ProductCategory>([
  "fruits",
  "vegetables",
  "grains",
  "tubers",
  "meat",
  "fish",
  "dairy",
  "spices",
  "herbs",
  "processed",
]);

function isProductCategory(value: string): value is ProductCategory {
  return validCategories.has(value as ProductCategory);
}

function applyMockFilters(
  products: Product[],
  { q, category, vendorId }: ProductSearchParams,
) {
  return products.filter((product) => {
    const matchesQuery =
      !q ||
      product.name.toLowerCase().includes(q.toLowerCase()) ||
      product.description.toLowerCase().includes(q.toLowerCase()) ||
      product.tags.some((tag) => tag.toLowerCase().includes(q.toLowerCase()));
    const matchesCategory = !category || product.category === category;
    const matchesVendor = !vendorId || product.vendorId === vendorId;

    return matchesQuery && matchesCategory && matchesVendor;
  });
}

export async function getPublicProducts(
  params: ProductSearchParams = {},
): Promise<Product[]> {
  const normalizedCategory =
    params.category && isProductCategory(params.category)
      ? params.category
      : undefined;

  if (!prisma) {
    return applyMockFilters(mockProducts, {
      ...params,
      category: normalizedCategory,
    });
  }

  try {
    const listings = await prisma.productListing.findMany({
      where: {
        publishStatus: "PUBLISHED",
        ...(normalizedCategory
          ? {
              product: {
                category: {
                  key: normalizedCategory,
                },
              },
            }
          : {}),
        ...(params.vendorId ? { vendorId: params.vendorId } : {}),
        ...(params.q
          ? {
              OR: [
                { title: { contains: params.q, mode: "insensitive" } },
                { description: { contains: params.q, mode: "insensitive" } },
                {
                  product: {
                    canonicalName: {
                      contains: params.q,
                      mode: "insensitive",
                    },
                  },
                },
              ],
            }
          : {}),
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
      orderBy: {
        createdAt: "desc",
      },
    });

    if (listings.length === 0) {
      return applyMockFilters(mockProducts, {
        ...params,
        category: normalizedCategory,
      });
    }

    return listings.map((listing) => {
      const categoryKey = listing.product.category.key;
      const inventory = listing.inventoryRecord;
      const imageUrls = listing.product.images.map((image) => image.storageKey);

      return {
        id: listing.id,
        vendorId: listing.vendorId,
        name: listing.title,
        category: isProductCategory(categoryKey) ? categoryKey : "processed",
        description: listing.description ?? listing.product.description ?? "",
        images:
          imageUrls.length > 0
            ? imageUrls
            : ["https://images.pexels.com/photos/533280/pexels-photo-533280.jpeg"],
        price: listing.basePriceKobo / 100,
        unit: listing.unitLabel,
        stock: inventory?.availableQuantity ?? 0,
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
          (inventory?.availableQuantity ?? 0) > 0,
        tags: [categoryKey, listing.availabilityStatus.toLowerCase()],
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt,
      };
    });
  } catch (error) {
    console.error("Failed to load products from Prisma, using mock fallback.", error);

    return applyMockFilters(mockProducts, {
      ...params,
      category: normalizedCategory,
    });
  }
}
