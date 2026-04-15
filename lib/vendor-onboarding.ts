import { prisma } from "./db/prisma";

type ApplicationData = {
  businessAddress?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
};

type VendorOnboardingRecord = {
  id: string;
  displayName: string;
  legalName: string;
  businessType: string | null;
  applicationStatus: string;
  verificationStatus: string;
  hubMemberships: Array<{
    isPrimary: boolean;
    hub: {
      id: string;
      code: string;
      name: string;
      area: string;
      lga: string;
    };
  }>;
  productListings: Array<{
    id: string;
  }>;
  applications: Array<{
    id: string;
    applicationStatus: string;
    applicationDataJson: unknown;
    preferredHub: {
      code: string;
      name: string;
    } | null;
    reviewedAt: Date | null;
  }>;
};

type VendorUserOnboardingRecord = {
  vendor: VendorOnboardingRecord;
};

function isApplicationData(value: unknown): value is ApplicationData {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getPrimaryHub(record: VendorOnboardingRecord) {
  return (
    record.hubMemberships.find((membership) => membership.isPrimary) ??
    record.hubMemberships[0] ??
    null
  );
}

export async function getVendorOnboardingSnapshot(userId: string) {
  if (!prisma) {
    return null;
  }

  const vendorUser = (await prisma.vendorUser.findFirst({
    where: {
      userId,
    },
    include: {
      vendor: {
        include: {
          hubMemberships: {
            include: {
              hub: true,
            },
          },
          productListings: {
            select: {
              id: true,
            },
          },
          applications: {
            orderBy: {
              createdAt: "desc",
            },
            include: {
              preferredHub: true,
            },
          },
        },
      },
    },
  })) as VendorUserOnboardingRecord | null;

  if (!vendorUser) {
    return null;
  }

  const vendor = vendorUser.vendor;
  const latestApplication = vendor.applications[0] ?? null;
  const applicationData = isApplicationData(latestApplication?.applicationDataJson)
    ? latestApplication.applicationDataJson
    : {};
  const primaryHub = getPrimaryHub(vendor);

  const steps = [
    {
      id: "approval",
      title: "Approval completed",
      description: "Marketplace operations approved the vendor account.",
      complete:
        vendor.applicationStatus === "APPROVED" &&
        vendor.verificationStatus === "APPROVED",
    },
    {
      id: "business-profile",
      title: "Business profile ready",
      description: "Business identity and address are on file.",
      complete: Boolean(
        vendor.displayName &&
          vendor.legalName &&
          vendor.businessType &&
          applicationData.businessAddress,
      ),
    },
    {
      id: "hub-assignment",
      title: "Hub assignment confirmed",
      description: "Primary Lagos hub is attached to the vendor.",
      complete: Boolean(primaryHub),
    },
    {
      id: "payout-setup",
      title: "Payout details on file",
      description: "Banking information has been captured for settlements.",
      complete: Boolean(
        applicationData.bankName &&
          applicationData.accountName &&
          applicationData.accountNumber,
      ),
    },
    {
      id: "first-listing",
      title: "First product listing created",
      description: "At least one listing exists so the vendor can go live.",
      complete: vendor.productListings.length > 0,
    },
  ];

  const activationReady = steps
    .filter((step) => step.id !== "first-listing")
    .every((step) => step.complete);
  const launchReady = steps.every((step) => step.complete);

  return {
    vendorId: vendor.id,
    businessName: vendor.displayName,
    activationReady,
    launchReady,
    currentHub: primaryHub
      ? {
          code: primaryHub.hub.code,
          name: primaryHub.hub.name,
          area: primaryHub.hub.area,
          lga: primaryHub.hub.lga,
        }
      : latestApplication?.preferredHub
        ? {
            code: latestApplication.preferredHub.code,
            name: latestApplication.preferredHub.name,
            area: "",
            lga: "",
          }
        : null,
    listingCount: vendor.productListings.length,
    latestApplication: latestApplication
      ? {
          id: latestApplication.id,
          applicationStatus: latestApplication.applicationStatus,
          reviewedAt: latestApplication.reviewedAt,
        }
      : null,
    steps,
  };
}
