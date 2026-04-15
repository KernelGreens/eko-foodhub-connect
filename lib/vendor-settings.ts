import { prisma } from "./db/prisma";

type VendorSettingsApplicationData = {
  businessAddress?: string;
  businessLicense?: string;
  taxId?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  bvn?: string;
};

type VendorSettingsRecord = {
  id: string;
  displayName: string;
  legalName: string;
  businessType: string | null;
  applicationStatus: string;
  verificationStatus: string;
  defaultCurrencyCode: string;
  hubMemberships: Array<{
    isPrimary: boolean;
    hub: {
      code: string;
      name: string;
      area: string;
      lga: string;
    };
  }>;
  applications: Array<{
    id: string;
    businessName: string;
    contactName: string;
    contactEmail: string | null;
    contactPhone: string | null;
    applicationStatus: string;
    applicationDataJson: unknown;
    preferredHub: {
      code: string;
      name: string;
    } | null;
  }>;
};

type VendorUserSettingsRecord = {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  vendorUsers: Array<{
    title: string | null;
    vendor: VendorSettingsRecord;
  }>;
};

type VendorSettingsUpdateInput = {
  name?: string;
  phone?: string;
  businessName?: string;
  legalName?: string;
  businessType?: string;
  businessAddress?: string;
  businessLicense?: string;
  taxId?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  bvn?: string;
};

function isApplicationData(value: unknown): value is VendorSettingsApplicationData {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getPrimaryHub(vendor: VendorSettingsRecord) {
  return (
    vendor.hubMemberships.find((membership) => membership.isPrimary) ??
    vendor.hubMemberships[0] ??
    null
  );
}

function mapVendorSettings(record: VendorUserSettingsRecord) {
  const vendorLink = record.vendorUsers[0];

  if (!vendorLink) {
    return null;
  }

  const vendor = vendorLink.vendor;
  const latestApplication = vendor.applications[0] ?? null;
  const applicationData = isApplicationData(latestApplication?.applicationDataJson)
    ? latestApplication.applicationDataJson
    : {};
  const primaryHub = getPrimaryHub(vendor);

  return {
    profile: {
      name: record.displayName,
      email: record.email ?? "",
      phone: record.phone ?? "",
      title: vendorLink.title ?? "Vendor Admin",
    },
    business: {
      businessName: vendor.displayName,
      legalName: vendor.legalName,
      businessType: vendor.businessType ?? "",
      businessAddress: applicationData.businessAddress ?? "",
      businessLicense: applicationData.businessLicense ?? "",
      taxId: applicationData.taxId ?? "",
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
    },
    banking: {
      bankName: applicationData.bankName ?? "",
      accountName: applicationData.accountName ?? "",
      accountNumber: applicationData.accountNumber ?? "",
      bvn: applicationData.bvn ?? "",
      currencyCode: vendor.defaultCurrencyCode,
    },
    verification: {
      emailVerified: record.isEmailVerified,
      phoneVerified: record.isPhoneVerified,
      businessVerified:
        vendor.applicationStatus === "APPROVED" &&
        vendor.verificationStatus === "APPROVED",
      hubAssigned: Boolean(primaryHub),
    },
  };
}

function validateVendorSettingsInput(input: VendorSettingsUpdateInput) {
  if (!input.name?.trim()) {
    return "Full name is required.";
  }

  if (!input.phone?.trim()) {
    return "Phone number is required.";
  }

  if (!input.businessName?.trim()) {
    return "Business name is required.";
  }

  if (!input.legalName?.trim()) {
    return "Legal business name is required.";
  }

  if (!input.businessType?.trim()) {
    return "Business type is required.";
  }

  if (!input.businessAddress?.trim()) {
    return "Business address is required.";
  }

  if (!input.bankName?.trim()) {
    return "Bank name is required.";
  }

  if (!input.accountName?.trim()) {
    return "Account name is required.";
  }

  if (!input.accountNumber?.trim()) {
    return "Account number is required.";
  }

  return null;
}

async function getVendorUserSettingsRecord(userId: string, vendorId: string) {
  if (!prisma) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      id: userId,
      vendorUsers: {
        some: {
          vendorId,
        },
      },
    },
    include: {
      vendorUsers: {
        where: {
          vendorId,
        },
        include: {
          vendor: {
            include: {
              hubMemberships: {
                include: {
                  hub: true,
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
      },
    },
  }) as Promise<VendorUserSettingsRecord | null>;
}

export async function getVendorSettings(userId: string, vendorId: string) {
  const record = await getVendorUserSettingsRecord(userId, vendorId);

  if (!record) {
    return null;
  }

  return mapVendorSettings(record);
}

export async function updateVendorSettings(
  userId: string,
  vendorId: string,
  input: VendorSettingsUpdateInput,
) {
  if (!prisma) {
    throw new Error("Database connection is required for vendor settings.");
  }

  const validationError = validateVendorSettingsInput(input);

  if (validationError) {
    throw new Error(validationError);
  }

  const record = await getVendorUserSettingsRecord(userId, vendorId);

  if (!record) {
    throw new Error("Vendor settings could not be found.");
  }

  const vendorLink = record.vendorUsers[0];

  if (!vendorLink) {
    throw new Error("Vendor settings could not be found.");
  }

  const latestApplication = vendorLink.vendor.applications[0] ?? null;
  const previousApplicationData = isApplicationData(latestApplication?.applicationDataJson)
    ? latestApplication.applicationDataJson
    : {};

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: {
        id: userId,
      },
      data: {
        displayName: input.name!.trim(),
        phone: input.phone!.trim(),
      },
    });

    await tx.vendor.update({
      where: {
        id: vendorId,
      },
      data: {
        displayName: input.businessName!.trim(),
        legalName: input.legalName!.trim(),
        businessType: input.businessType!.trim(),
      },
    });

    if (latestApplication) {
      await tx.vendorApplication.update({
        where: {
          id: latestApplication.id,
        },
        data: {
          businessName: input.businessName!.trim(),
          contactName: input.name!.trim(),
          contactPhone: input.phone!.trim(),
          applicationDataJson: {
            ...previousApplicationData,
            businessAddress: input.businessAddress?.trim(),
            businessLicense: input.businessLicense?.trim(),
            taxId: input.taxId?.trim(),
            bankName: input.bankName?.trim(),
            accountName: input.accountName?.trim(),
            accountNumber: input.accountNumber?.trim(),
            bvn: input.bvn?.trim(),
          },
        },
      });
    } else {
      await tx.vendorApplication.create({
        data: {
          applicantUserId: userId,
          vendorId,
          businessName: input.businessName!.trim(),
          contactName: input.name!.trim(),
          contactEmail: record.email,
          contactPhone: input.phone!.trim(),
          applicationStatus: "APPROVED",
          reviewedAt: new Date(),
          submittedAt: new Date(),
          applicationDataJson: {
            businessType: input.businessType?.trim(),
            businessAddress: input.businessAddress?.trim(),
            businessLicense: input.businessLicense?.trim(),
            taxId: input.taxId?.trim(),
            bankName: input.bankName?.trim(),
            accountName: input.accountName?.trim(),
            accountNumber: input.accountNumber?.trim(),
            bvn: input.bvn?.trim(),
          },
        },
      });
    }
  });

  const updatedRecord = await getVendorUserSettingsRecord(userId, vendorId);

  if (!updatedRecord) {
    throw new Error("Vendor settings could not be reloaded after update.");
  }

  return mapVendorSettings(updatedRecord);
}
