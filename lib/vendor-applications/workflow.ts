import type { VendorApplicationSummary, VendorApplicationStatus } from "../../types";
import { prisma } from "../db/prisma";
import { buildSessionCookie, createAppSessionToken } from "../auth/session";
import { hashPassword } from "../auth/password";

type ApplicationData = {
  businessType?: string;
  businessAddress?: string;
  businessLicense?: string;
  taxId?: string;
  preferredHub?: string;
  productCategories?: string[];
  estimatedVolume?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  bvn?: string;
};

export type VendorApplicationSubmissionInput = {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  businessName?: string;
  businessType?: string;
  businessAddress?: string;
  businessLicense?: string;
  taxId?: string;
  preferredHub?: string;
  productCategories?: string[];
  estimatedVolume?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  bvn?: string;
};

type ReviewVendorApplicationInput = {
  applicationId: string;
  reviewerUserId: string;
  action: "approve" | "reject";
  rejectionReason?: string;
};

export type VendorApplicationUpdateInput = {
  name?: string;
  phone?: string;
  businessName?: string;
  businessType?: string;
  businessAddress?: string;
  businessLicense?: string;
  taxId?: string;
  preferredHub?: string;
  productCategories?: string[];
  estimatedVolume?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  bvn?: string;
};

type VendorApplicationRecord = {
  id: string;
  applicantUserId: string;
  vendorId: string | null;
  businessName: string;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  applicationStatus: string;
  rejectionReason: string | null;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  applicationDataJson: unknown;
  preferredHub: {
    id: string;
    code: string;
    name: string;
  } | null;
  applicant?: {
    id: string;
    email: string | null;
    displayName: string;
    phone: string | null;
    createdAt: Date;
  };
  reviewedBy: {
    id: string;
    email: string | null;
    displayName: string;
  } | null;
};

const DEFAULT_HUBS = [
  {
    code: "idi-oro",
    name: "Idi-Oro Hub",
    addressLine: "15 Market Street",
    area: "Idi-Oro",
    lga: "Mushin",
    state: "Lagos",
    isActive: true,
  },
  {
    code: "ajah",
    name: "Ajah Hub",
    addressLine: "12 Coastal Road",
    area: "Ajah",
    lga: "Eti-Osa",
    state: "Lagos",
    isActive: false,
  },
  {
    code: "agege",
    name: "Agege Hub",
    addressLine: "33 Old Abeokuta Road",
    area: "Agege",
    lga: "Agege",
    state: "Lagos",
    isActive: false,
  },
  {
    code: "abule-ado",
    name: "Abule Ado Hub",
    addressLine: "6 Trade Fair Link Road",
    area: "Abule Ado",
    lga: "Amuwo-Odofin",
    state: "Lagos",
    isActive: false,
  },
];

function normalizeStatus(status: string): VendorApplicationStatus {
  switch (status) {
    case "DRAFT":
      return "draft";
    case "UNDER_REVIEW":
      return "under-review";
    case "APPROVED":
      return "approved";
    case "REJECTED":
      return "rejected";
    case "SUSPENDED":
      return "suspended";
    case "SUBMITTED":
    default:
      return "submitted";
  }
}

function isApplicationData(value: unknown): value is ApplicationData {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mapVendorApplicationSummary(
  application: VendorApplicationRecord,
): VendorApplicationSummary {
  const applicationData = isApplicationData(application.applicationDataJson)
    ? application.applicationDataJson
    : {};

  return {
    id: application.id,
    applicantUserId: application.applicantUserId,
    businessName: application.businessName,
    contactName: application.contactName,
    contactEmail: application.contactEmail ?? "",
    contactPhone: application.contactPhone ?? "",
    preferredHubCode: application.preferredHub?.code,
    preferredHubName: application.preferredHub?.name,
    applicationStatus: normalizeStatus(application.applicationStatus),
    rejectionReason: application.rejectionReason ?? undefined,
    submittedAt: application.submittedAt ?? undefined,
    reviewedAt: application.reviewedAt ?? undefined,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    applicationData: {
      businessType: applicationData.businessType,
      businessAddress: applicationData.businessAddress,
      businessLicense: applicationData.businessLicense,
      taxId: applicationData.taxId,
      preferredHub: applicationData.preferredHub,
      productCategories: applicationData.productCategories,
      estimatedVolume: applicationData.estimatedVolume,
      bankName: applicationData.bankName,
      accountName: applicationData.accountName,
      accountNumber: applicationData.accountNumber,
      bvn: applicationData.bvn,
    },
    reviewer: application.reviewedBy
      ? {
          id: application.reviewedBy.id,
          name: application.reviewedBy.displayName,
          email: application.reviewedBy.email ?? "",
        }
      : undefined,
  };
}

async function ensureDefaultHubs() {
  if (!prisma) {
    return [];
  }

  const hubs = [];

  for (const hub of DEFAULT_HUBS) {
    const savedHub = await prisma.hub.upsert({
      where: {
        code: hub.code,
      },
      update: hub,
      create: hub,
    });

    hubs.push(savedHub);
  }

  return hubs;
}

async function resolvePreferredHubId(preferredHubCode?: string) {
  if (!prisma || !preferredHubCode) {
    return null;
  }

  const hubs = await ensureDefaultHubs();
  const hub = hubs.find((candidate) => candidate.code === preferredHubCode);

  return hub?.id ?? null;
}

function validateSubmissionInput(input: VendorApplicationSubmissionInput) {
  const requiredFields = [
    input.name?.trim(),
    input.email?.trim(),
    input.phone?.trim(),
    input.businessName?.trim(),
    input.businessType?.trim(),
    input.businessAddress?.trim(),
    input.preferredHub?.trim(),
    input.estimatedVolume?.trim(),
    input.bankName?.trim(),
    input.accountName?.trim(),
    input.accountNumber?.trim(),
  ];

  if (requiredFields.some((value) => !value)) {
    return "Complete all required application fields before submitting.";
  }

  if ((input.password ?? "").length < 8) {
    return "Password must be at least 8 characters long.";
  }

  if (!input.productCategories?.length) {
    return "Select at least one product category.";
  }

  return null;
}

export async function submitVendorApplication(
  input: VendorApplicationSubmissionInput,
) {
  if (!prisma) {
    throw new Error("Database connection is required for vendor applications.");
  }

  const validationError = validateSubmissionInput(input);

  if (validationError) {
    throw new Error(validationError);
  }

  const email = input.email!.trim().toLowerCase();
  const phone = input.phone!.trim();
  const name = input.name!.trim();
  const preferredHubId = await resolvePreferredHubId(input.preferredHub?.trim());

  if (!preferredHubId) {
    throw new Error("Select a valid preferred hub before submitting.");
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { phone }],
    },
  });

  if (existingUser) {
    throw new Error("An account with this email or phone already exists.");
  }

  const passwordHash = await hashPassword(input.password!);
  const submittedAt = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        phone,
        displayName: name,
        passwordHash,
      },
    });

    const application = await tx.vendorApplication.create({
      data: {
        applicantUserId: user.id,
        businessName: input.businessName!.trim(),
        contactName: name,
        contactEmail: email,
        contactPhone: phone,
        preferredHubId,
        applicationStatus: "SUBMITTED",
        submittedAt,
        applicationDataJson: {
          businessType: input.businessType?.trim(),
          businessAddress: input.businessAddress?.trim(),
          businessLicense: input.businessLicense?.trim(),
          taxId: input.taxId?.trim(),
          preferredHub: input.preferredHub?.trim(),
          productCategories: input.productCategories ?? [],
          estimatedVolume: input.estimatedVolume?.trim(),
          bankName: input.bankName?.trim(),
          accountName: input.accountName?.trim(),
          accountNumber: input.accountNumber?.trim(),
          bvn: input.bvn?.trim(),
        },
      },
      include: {
        preferredHub: true,
        reviewedBy: true,
      },
    });

    return { user, application };
  });

  const token = createAppSessionToken({
    userId: result.user.id,
    email: result.user.email ?? email,
    name: result.user.displayName,
    role: "vendor-applicant",
  });

  return {
    user: {
      id: result.user.id,
      email: result.user.email ?? email,
      name: result.user.displayName,
      phone: result.user.phone ?? phone,
      role: "vendor-applicant" as const,
      createdAt: result.user.createdAt,
      isVerified: false,
    },
    application: mapVendorApplicationSummary(result.application),
    cookie: buildSessionCookie(token),
  };
}

export async function getMyVendorApplication(userId: string) {
  if (!prisma) {
    return null;
  }

  const application = (await prisma.vendorApplication.findFirst({
    where: {
      applicantUserId: userId,
    },
    include: {
      preferredHub: true,
      reviewedBy: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })) as VendorApplicationRecord | null;

  return application ? mapVendorApplicationSummary(application) : null;
}

export async function listVendorApplications() {
  if (!prisma) {
    return [];
  }

  const applications = (await prisma.vendorApplication.findMany({
    include: {
      applicant: true,
      preferredHub: true,
      reviewedBy: true,
    },
    orderBy: [
      {
        submittedAt: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  })) as VendorApplicationRecord[];

  return applications.map((application) =>
    mapVendorApplicationSummary(application),
  );
}

export async function updateVendorApplication(
  userId: string,
  input: VendorApplicationUpdateInput,
) {
  if (!prisma) {
    throw new Error("Database connection is required for vendor applications.");
  }

  const application = (await prisma.vendorApplication.findFirst({
    where: {
      applicantUserId: userId,
    },
    include: {
      preferredHub: true,
      reviewedBy: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })) as VendorApplicationRecord | null;

  if (!application) {
    throw new Error("Vendor application not found.");
  }

  if (normalizeStatus(application.applicationStatus) === "approved") {
    throw new Error("Approved vendor applications cannot be edited here.");
  }

  const validationError = validateSubmissionInput({
    ...input,
    email: application.contactEmail ?? undefined,
    password: "placeholder-password",
  });

  if (validationError) {
    throw new Error(validationError);
  }

  const preferredHubId = await resolvePreferredHubId(input.preferredHub?.trim());

  if (!preferredHubId) {
    throw new Error("Select a valid preferred hub before resubmitting.");
  }

  const submittedAt = new Date();

  const updatedApplication = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: {
        id: userId,
      },
      data: {
        displayName: input.name!.trim(),
        phone: input.phone!.trim(),
      },
    });

    return tx.vendorApplication.update({
      where: {
        id: application.id,
      },
      data: {
        businessName: input.businessName!.trim(),
        contactName: input.name!.trim(),
        contactPhone: input.phone!.trim(),
        preferredHubId,
        applicationStatus: "SUBMITTED",
        rejectionReason: null,
        reviewedAt: null,
        reviewedByUserId: null,
        submittedAt,
        applicationDataJson: {
          businessType: input.businessType?.trim(),
          businessAddress: input.businessAddress?.trim(),
          businessLicense: input.businessLicense?.trim(),
          taxId: input.taxId?.trim(),
          preferredHub: input.preferredHub?.trim(),
          productCategories: input.productCategories ?? [],
          estimatedVolume: input.estimatedVolume?.trim(),
          bankName: input.bankName?.trim(),
          accountName: input.accountName?.trim(),
          accountNumber: input.accountNumber?.trim(),
          bvn: input.bvn?.trim(),
        },
      },
      include: {
        preferredHub: true,
        reviewedBy: true,
      },
    });
  });

  return mapVendorApplicationSummary(
    updatedApplication as VendorApplicationRecord,
  );
}

export async function reviewVendorApplication(
  input: ReviewVendorApplicationInput,
) {
  if (!prisma) {
    throw new Error("Database connection is required for vendor approvals.");
  }

  const application = (await prisma.vendorApplication.findUnique({
    where: {
      id: input.applicationId,
    },
    include: {
      applicant: true,
      preferredHub: true,
      reviewedBy: true,
    },
  })) as (VendorApplicationRecord & {
    applicant: NonNullable<VendorApplicationRecord["applicant"]>;
  }) | null;

  if (!application?.applicant) {
    throw new Error("Vendor application not found.");
  }

  if (input.action === "reject" && !input.rejectionReason?.trim()) {
    throw new Error("Provide a rejection reason before rejecting an application.");
  }

  const applicationData = isApplicationData(application.applicationDataJson)
    ? application.applicationDataJson
    : {};

  const reviewedAt = new Date();

  const updatedApplication = await prisma.$transaction(async (tx) => {
    let vendorId = application.vendorId;

    if (input.action === "approve") {
      const vendor = vendorId
        ? await tx.vendor.update({
            where: {
              id: vendorId,
            },
            data: {
              displayName: application.businessName,
              legalName: application.businessName,
              businessType: applicationData.businessType?.trim(),
              applicationStatus: "APPROVED",
              verificationStatus: "APPROVED",
            },
          })
        : await tx.vendor.create({
            data: {
              displayName: application.businessName,
              legalName: application.businessName,
              businessType: applicationData.businessType?.trim(),
              applicationStatus: "APPROVED",
              verificationStatus: "APPROVED",
            },
          });

      vendorId = vendor.id;

      const existingVendorUser = await tx.vendorUser.findFirst({
        where: {
          vendorId,
          userId: application.applicantUserId,
        },
      });

      if (!existingVendorUser) {
        await tx.vendorUser.create({
          data: {
            vendorId,
            userId: application.applicantUserId,
            title: "Vendor Admin",
          },
        });
      }

      if (application.preferredHub?.id) {
        const existingMembership = await tx.vendorHubMembership.findFirst({
          where: {
            vendorId,
            hubId: application.preferredHub.id,
          },
        });

        if (!existingMembership) {
          await tx.vendorHubMembership.create({
            data: {
              vendorId,
              hubId: application.preferredHub.id,
              isPrimary: true,
            },
          });
        }
      }
    }

    return tx.vendorApplication.update({
      where: {
        id: application.id,
      },
      data: {
        vendorId,
        applicationStatus: input.action === "approve" ? "APPROVED" : "REJECTED",
        reviewedByUserId: input.reviewerUserId,
        reviewedAt,
        rejectionReason:
          input.action === "reject" ? input.rejectionReason?.trim() ?? null : null,
      },
      include: {
        preferredHub: true,
        reviewedBy: true,
      },
    });
  });

  return mapVendorApplicationSummary(
    updatedApplication as VendorApplicationRecord,
  );
}
