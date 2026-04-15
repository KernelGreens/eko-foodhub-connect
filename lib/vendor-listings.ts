import type {
  ProductCategory,
  VendorListingAvailabilityStatus,
  VendorListingPublishStatus,
  VendorListingSummary,
} from "../types";
import { prisma } from "./db/prisma";

type ListingInput = {
  name?: string;
  category?: ProductCategory;
  description?: string;
  price?: number;
  unit?: string;
  stock?: number;
  minOrder?: number;
  maxOrder?: number | null;
  freshness?: "fresh" | "very-fresh" | "premium";
  isOrganic?: boolean;
};

type ListingStatusAction =
  | "submit-for-review"
  | "unpublish"
  | "publish"
  | "return-to-draft";

type ListingRecord = {
  id: string;
  vendorId: string;
  title: string;
  description: string | null;
  unitLabel: string;
  minimumOrderQuantity: number;
  maximumOrderQuantity: number | null;
  basePriceKobo: number;
  availabilityStatus: string;
  publishStatus: string;
  freshnessGrade: string | null;
  isOrganic: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  vendor: {
    displayName: string;
  };
  product: {
    id: string;
    canonicalName: string;
    description: string | null;
    category: {
      key: string;
      name: string;
    };
    images: Array<{
      storageKey: string;
    }>;
  };
  inventoryRecord: {
    availableQuantity: number;
    stockStatus: string;
  } | null;
};

const VALID_CATEGORIES = new Set<ProductCategory>([
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

const DEFAULT_LISTING_IMAGE =
  "https://images.pexels.com/photos/533280/pexels-photo-533280.jpeg";

function assertPrisma() {
  if (!prisma) {
    throw new Error("Database connection is required for vendor listing workflows.");
  }

  return prisma;
}

function isProductCategory(value: string): value is ProductCategory {
  return VALID_CATEGORIES.has(value as ProductCategory);
}

function toCategoryName(category: ProductCategory) {
  return category
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function mapAvailabilityStatus(stock: number): {
  prismaStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  clientStatus: VendorListingAvailabilityStatus;
} {
  if (stock <= 0) {
    return {
      prismaStatus: "OUT_OF_STOCK",
      clientStatus: "out-of-stock",
    };
  }

  if (stock < 10) {
    return {
      prismaStatus: "LOW_STOCK",
      clientStatus: "low-stock",
    };
  }

  return {
    prismaStatus: "IN_STOCK",
    clientStatus: "in-stock",
  };
}

function mapPrismaPublishStatus(status: string): VendorListingPublishStatus {
  switch (status) {
    case "PENDING_REVIEW":
      return "pending-review";
    case "PUBLISHED":
      return "published";
    case "UNPUBLISHED":
      return "unpublished";
    case "ARCHIVED":
      return "archived";
    case "DRAFT":
    default:
      return "draft";
  }
}

function mapPrismaAvailabilityStatus(status: string): VendorListingAvailabilityStatus {
  switch (status) {
    case "LOW_STOCK":
      return "low-stock";
    case "OUT_OF_STOCK":
      return "out-of-stock";
    case "UNAVAILABLE":
      return "unavailable";
    case "IN_STOCK":
    default:
      return "in-stock";
  }
}

function mapFreshnessGrade(
  freshness?: ListingInput["freshness"],
): "FRESH" | "VERY_FRESH" | "PREMIUM" | undefined {
  switch (freshness) {
    case "very-fresh":
      return "VERY_FRESH";
    case "premium":
      return "PREMIUM";
    case "fresh":
      return "FRESH";
    default:
      return undefined;
  }
}

function mapListingSummary(record: ListingRecord): VendorListingSummary {
  const categoryKey = isProductCategory(record.product.category.key)
    ? record.product.category.key
    : "processed";

  return {
    id: record.id,
    vendorId: record.vendorId,
    vendorName: record.vendor.displayName,
    name: record.title,
    category: categoryKey,
    description: record.description ?? record.product.description ?? "",
    image: record.product.images[0]?.storageKey ?? DEFAULT_LISTING_IMAGE,
    price: record.basePriceKobo / 100,
    unit: record.unitLabel,
    stock: record.inventoryRecord?.availableQuantity ?? 0,
    minOrder: record.minimumOrderQuantity,
    maxOrder: record.maximumOrderQuantity ?? undefined,
    freshness:
      record.freshnessGrade === "VERY_FRESH"
        ? "very-fresh"
        : record.freshnessGrade === "PREMIUM"
          ? "premium"
          : "fresh",
    isOrganic: record.isOrganic,
    publishStatus: mapPrismaPublishStatus(record.publishStatus),
    availabilityStatus: mapPrismaAvailabilityStatus(record.availabilityStatus),
    publishedAt: record.publishedAt ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function validateListingInput(input: ListingInput) {
  if (!input.name?.trim()) {
    return "Listing name is required.";
  }

  if (!input.category || !isProductCategory(input.category)) {
    return "A valid product category is required.";
  }

  if (!input.unit?.trim()) {
    return "Unit label is required.";
  }

  if (!Number.isFinite(input.price) || (input.price ?? 0) <= 0) {
    return "Price must be greater than zero.";
  }

  if (!Number.isInteger(input.stock) || (input.stock ?? -1) < 0) {
    return "Stock must be zero or a positive integer.";
  }

  if (!Number.isInteger(input.minOrder) || (input.minOrder ?? 0) < 1) {
    return "Minimum order must be at least 1.";
  }

  if (
    input.maxOrder != null &&
    (!Number.isInteger(input.maxOrder) || input.maxOrder < input.minOrder!)
  ) {
    return "Maximum order must be greater than or equal to the minimum order.";
  }

  return null;
}

async function getVendorUserForUserId(userId: string) {
  const db = assertPrisma();

  const vendorUser = await db.vendorUser.findFirst({
    where: {
      userId,
    },
  });

  if (!vendorUser) {
    throw new Error("Vendor account not found for this user.");
  }

  return vendorUser;
}

async function ensureProductCategory(category: ProductCategory) {
  const db = assertPrisma();

  return db.productCategory.upsert({
    where: {
      key: category,
    },
    update: {
      name: toCategoryName(category),
    },
    create: {
      key: category,
      name: toCategoryName(category),
    },
  });
}

async function getListingForVendor(userId: string, listingId: string) {
  const db = assertPrisma();
  const vendorUser = await getVendorUserForUserId(userId);

  const listing = (await db.productListing.findFirst({
    where: {
      id: listingId,
      vendorId: vendorUser.vendorId,
    },
    include: {
      vendor: true,
      product: {
        include: {
          category: true,
          images: true,
        },
      },
      inventoryRecord: true,
    },
  })) as ListingRecord | null;

  if (!listing) {
    throw new Error("Vendor listing not found.");
  }

  return listing;
}

async function getListingForAdmin(listingId: string) {
  const db = assertPrisma();

  const listing = (await db.productListing.findFirst({
    where: {
      id: listingId,
    },
    include: {
      vendor: true,
      product: {
        include: {
          category: true,
          images: true,
        },
      },
      inventoryRecord: true,
    },
  })) as ListingRecord | null;

  if (!listing) {
    throw new Error("Vendor listing not found.");
  }

  return listing;
}

export async function listVendorListings(userId: string) {
  const db = assertPrisma();
  const vendorUser = await getVendorUserForUserId(userId);

  const listings = (await db.productListing.findMany({
    where: {
      vendorId: vendorUser.vendorId,
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
      inventoryRecord: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })) as ListingRecord[];

  return listings.map(mapListingSummary);
}

export async function createVendorListing(userId: string, input: ListingInput) {
  const db = assertPrisma();
  const validationError = validateListingInput(input);

  if (validationError) {
    throw new Error(validationError);
  }

  const vendorUser = await getVendorUserForUserId(userId);
  const category = await ensureProductCategory(input.category!);
  const availability = mapAvailabilityStatus(input.stock!);

  const listing = (await db.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        categoryId: category.id,
        canonicalName: input.name!.trim(),
        description: input.description?.trim(),
        images: {
          create: {
            storageKey: DEFAULT_LISTING_IMAGE,
            altText: input.name!.trim(),
          },
        },
      },
    });

    const createdListing = await tx.productListing.create({
      data: {
        vendorId: vendorUser.vendorId,
        productId: product.id,
        title: input.name!.trim(),
        description: input.description?.trim(),
        unitLabel: input.unit!.trim(),
        minimumOrderQuantity: input.minOrder!,
        maximumOrderQuantity: input.maxOrder ?? null,
        basePriceKobo: Math.round(input.price! * 100),
        availabilityStatus: availability.prismaStatus,
        publishStatus: "DRAFT",
        freshnessGrade: mapFreshnessGrade(input.freshness),
        isOrganic: Boolean(input.isOrganic),
      },
      include: {
        vendor: true,
        product: {
          include: {
            category: true,
            images: true,
          },
        },
        inventoryRecord: true,
      },
    });

    await tx.inventoryRecord.create({
      data: {
        productListingId: createdListing.id,
        availableQuantity: input.stock!,
        stockStatus: availability.prismaStatus,
      },
    });

    return tx.productListing.findFirst({
      where: {
        id: createdListing.id,
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
        inventoryRecord: true,
      },
    });
  })) as ListingRecord | null;

  if (!listing) {
    throw new Error("Vendor listing could not be created.");
  }

  return mapListingSummary(listing);
}

export async function updateVendorListing(
  userId: string,
  listingId: string,
  input: ListingInput,
) {
  const db = assertPrisma();
  const validationError = validateListingInput(input);

  if (validationError) {
    throw new Error(validationError);
  }

  const existingListing = await getListingForVendor(userId, listingId);
  const category = await ensureProductCategory(input.category!);
  const availability = mapAvailabilityStatus(input.stock!);

  const updatedListing = (await db.$transaction(async (tx) => {
    await tx.product.update({
      where: {
        id: existingListing.product.id,
      },
      data: {
        canonicalName: input.name!.trim(),
        description: input.description?.trim(),
        categoryId: category.id,
      },
    });

    await tx.productListing.update({
      where: {
        id: existingListing.id,
      },
      data: {
        title: input.name!.trim(),
        description: input.description?.trim(),
        unitLabel: input.unit!.trim(),
        minimumOrderQuantity: input.minOrder!,
        maximumOrderQuantity: input.maxOrder ?? null,
        basePriceKobo: Math.round(input.price! * 100),
        availabilityStatus: availability.prismaStatus,
        freshnessGrade: mapFreshnessGrade(input.freshness),
        isOrganic: Boolean(input.isOrganic),
      },
    });

    await tx.inventoryRecord.upsert({
      where: {
        productListingId: existingListing.id,
      },
      update: {
        availableQuantity: input.stock!,
        stockStatus: availability.prismaStatus,
      },
      create: {
        productListingId: existingListing.id,
        availableQuantity: input.stock!,
        stockStatus: availability.prismaStatus,
      },
    });

    return tx.productListing.findFirst({
      where: {
        id: existingListing.id,
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
        inventoryRecord: true,
      },
    });
  })) as ListingRecord | null;

  if (!updatedListing) {
    throw new Error("Vendor listing could not be updated.");
  }

  return mapListingSummary(updatedListing);
}

export async function deleteVendorListing(userId: string, listingId: string) {
  const db = assertPrisma();
  const listing = await getListingForVendor(userId, listingId);
  const productId = listing.product.id;

  await db.$transaction(async (tx) => {
    await tx.productListing.delete({
      where: {
        id: listing.id,
      },
    });

    const remainingListings = await tx.productListing.count({
      where: {
        productId,
      },
    });

    if (remainingListings === 0) {
      await tx.product.delete({
        where: {
          id: productId,
        },
      });
    }
  });
}

export async function changeVendorListingStatus(
  userId: string,
  listingId: string,
  action: Extract<ListingStatusAction, "submit-for-review" | "unpublish">,
) {
  const db = assertPrisma();
  const listing = await getListingForVendor(userId, listingId);

  const nextStatus =
    action === "submit-for-review" ? "PENDING_REVIEW" : "UNPUBLISHED";

  const updatedListing = (await db.productListing.update({
    where: {
      id: listing.id,
    },
    data: {
      publishStatus: nextStatus,
      ...(action === "unpublish"
        ? {
            publishedAt: null,
          }
        : {}),
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
      inventoryRecord: true,
    },
  })) as ListingRecord;

  return mapListingSummary(updatedListing);
}

export async function listAdminListings() {
  const db = assertPrisma();

  const listings = (await db.productListing.findMany({
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
      inventoryRecord: true,
    },
    orderBy: [
      {
        publishStatus: "asc",
      },
      {
        createdAt: "desc",
      },
    ],
  })) as ListingRecord[];

  return listings.map(mapListingSummary);
}

export async function changeAdminListingStatus(
  listingId: string,
  action: Extract<ListingStatusAction, "publish" | "unpublish" | "return-to-draft">,
) {
  const db = assertPrisma();
  const listing = await getListingForAdmin(listingId);

  const statusMap = {
    publish: "PUBLISHED",
    unpublish: "UNPUBLISHED",
    "return-to-draft": "DRAFT",
  } as const;

  const updatedListing = (await db.productListing.update({
    where: {
      id: listing.id,
    },
    data: {
      publishStatus: statusMap[action],
      publishedAt: action === "publish" ? new Date() : null,
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
      inventoryRecord: true,
    },
  })) as ListingRecord;

  return mapListingSummary(updatedListing);
}
