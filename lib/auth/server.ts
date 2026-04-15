import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import type { AdminRole, User, Vendor } from "../../types";
import { prisma } from "../db/prisma";
import { AUTH_SESSION_COOKIE } from "./constants";
import { verifyAppSessionToken } from "./session";

type SessionUserRecord = {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string;
  createdAt: Date;
  buyerProfile: { id: string } | null;
  adminProfile: { id: string } | null;
  vendorApplications: Array<{
    id: string;
    applicationStatus: string;
    submittedAt: Date | null;
  }>;
  roleAssignments: Array<{
    scopeType: string;
    scopeId: string | null;
    role: {
      key: string;
    };
  }>;
  vendorUsers: Array<{
    id: string;
    vendorId: string;
    title: string | null;
    vendor: {
      id: string;
      displayName: string;
      legalName: string;
      applicationStatus: string;
      verificationStatus: string;
      hubMemberships: Array<{
        isPrimary: boolean;
        hub: {
          code: string;
          addressLine: string;
          area: string;
          lga: string;
          state: string;
        };
      }>;
      applications: Array<{
        id: string;
        applicationDataJson: unknown;
      }>;
    };
  }>;
};

type SessionVendorApplicationData = {
  businessAddress?: string;
};

export type AuthenticatedAppSession = {
  userId: string;
  user: User | Vendor;
  role: "buyer" | "vendor" | "vendor-applicant" | "admin";
  vendorId?: string;
  adminRole?: AdminRole;
};

export type AuthenticatedBuyerSession = AuthenticatedAppSession & {
  role: "buyer";
  user: User;
};

export type AuthenticatedVendorSession = AuthenticatedAppSession & {
  role: "vendor";
  user: Vendor;
  vendorId: string;
};

export type AuthenticatedAdminSession = AuthenticatedAppSession & {
  role: "admin";
  user: User;
  adminRole: AdminRole;
};

export type AuthenticatedVendorApplicantSession = AuthenticatedAppSession & {
  role: "vendor-applicant";
  user: User;
};

function getVendorHubLocation(
  memberships: SessionUserRecord["vendorUsers"][number]["vendor"]["hubMemberships"],
): Vendor["hubLocation"] {
  const primaryMembership =
    memberships.find((membership) => membership.isPrimary) ?? memberships[0];
  const hubCode = primaryMembership?.hub.code;

  switch (hubCode) {
    case "ajah":
    case "agege":
    case "abule-ado":
    case "idi-oro":
      return hubCode;
    default:
      return "idi-oro";
  }
}

function mapBuyerToClientUser(user: SessionUserRecord): User {
  return {
    id: user.id,
    email: user.email ?? "",
    name: user.displayName,
    phone: user.phone ?? "",
    role: "buyer",
    createdAt: user.createdAt,
    isVerified: true,
  };
}

function mapAdminToClientUser(
  user: SessionUserRecord,
  adminRole: AdminRole,
): User {
  return {
    id: user.id,
    email: user.email ?? "",
    name: user.displayName,
    phone: user.phone ?? "",
    role: "admin",
    adminRole,
    createdAt: user.createdAt,
    isVerified: true,
  };
}

function mapVendorApplicantToClientUser(user: SessionUserRecord): User {
  return {
    id: user.id,
    email: user.email ?? "",
    name: user.displayName,
    phone: user.phone ?? "",
    role: "vendor-applicant",
    createdAt: user.createdAt,
    isVerified: false,
  };
}

function mapVendorToClientUser(
  user: SessionUserRecord,
  vendorUser: SessionUserRecord["vendorUsers"][number],
): Vendor {
  const latestApplication = vendorUser.vendor.applications[0];
  const latestApplicationData =
    latestApplication?.applicationDataJson &&
    typeof latestApplication.applicationDataJson === "object" &&
    !Array.isArray(latestApplication.applicationDataJson)
      ? (latestApplication.applicationDataJson as SessionVendorApplicationData)
      : null;
  const primaryMembership =
    vendorUser.vendor.hubMemberships.find((membership) => membership.isPrimary) ??
    vendorUser.vendor.hubMemberships[0];
  const businessAddress =
    latestApplicationData?.businessAddress?.trim() ||
    (primaryMembership
      ? `${primaryMembership.hub.addressLine}, ${primaryMembership.hub.area}, ${primaryMembership.hub.lga}`
      : "Lagos, Nigeria");

  return {
    id: vendorUser.vendor.id,
    email: user.email ?? "",
    name: user.displayName,
    phone: user.phone ?? "",
    role: "vendor",
    createdAt: user.createdAt,
    isVerified:
      vendorUser.vendor.applicationStatus === "APPROVED" &&
      vendorUser.vendor.verificationStatus === "APPROVED",
    businessName: vendorUser.vendor.displayName,
    businessAddress,
    hubLocation: getVendorHubLocation(vendorUser.vendor.hubMemberships),
    vendorId: vendorUser.vendor.id,
    rating: 4.8,
    totalSales: 2500000,
    isActive:
      vendorUser.vendor.applicationStatus === "APPROVED" &&
      vendorUser.vendor.verificationStatus === "APPROVED",
  };
}

function resolveAdminRole(user: SessionUserRecord): AdminRole | null {
  const roleKeys = user.roleAssignments.map((assignment) => assignment.role.key);

  if (roleKeys.includes("super-admin")) {
    return "super-admin";
  }

  if (roleKeys.includes("operations-admin")) {
    return "operations-admin";
  }

  return null;
}

async function getSessionUserRecord(userId: string, email: string) {
  if (!prisma) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      id: userId,
      email,
    },
    include: {
      buyerProfile: true,
      adminProfile: true,
      vendorApplications: {
        orderBy: {
          createdAt: "desc",
        },
      },
      roleAssignments: {
        include: {
          role: true,
        },
      },
      vendorUsers: {
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
                take: 1,
              },
            },
          },
        },
      },
    },
  }) as Promise<SessionUserRecord | null>;
}

export async function getAuthenticatedAppSession(): Promise<AuthenticatedAppSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
  const payload = verifyAppSessionToken(token);

  if (!payload || !prisma) {
    return null;
  }

  const user = await getSessionUserRecord(payload.userId, payload.email);

  if (!user) {
    return null;
  }

  if (payload.role === "buyer" && user.buyerProfile) {
    return {
      userId: user.id,
      user: mapBuyerToClientUser(user),
      role: "buyer",
    };
  }

  if (payload.role === "vendor" && payload.vendorId) {
    const vendorUser = user.vendorUsers.find(
      (candidate) => candidate.vendorId === payload.vendorId,
    );

    if (!vendorUser) {
      return null;
    }

    return {
      userId: user.id,
      user: mapVendorToClientUser(user, vendorUser),
      role: "vendor",
      vendorId: vendorUser.vendorId,
    };
  }

  if (payload.role === "vendor-applicant") {
    const firstVendorUser = user.vendorUsers[0];

    if (firstVendorUser) {
      return {
        userId: user.id,
        user: mapVendorToClientUser(user, firstVendorUser),
        role: "vendor",
        vendorId: firstVendorUser.vendorId,
      };
    }

    if (user.vendorApplications.length > 0) {
      return {
        userId: user.id,
        user: mapVendorApplicantToClientUser(user),
        role: "vendor-applicant",
      };
    }
  }

  if (payload.role === "admin" && user.adminProfile) {
    const adminRole = resolveAdminRole(user);

    if (!adminRole || (payload.adminRole && payload.adminRole !== adminRole)) {
      return null;
    }

    return {
      userId: user.id,
      user: mapAdminToClientUser(user, adminRole),
      role: "admin",
      adminRole,
    };
  }

  return null;
}

export async function getAuthenticatedBuyerSession(): Promise<AuthenticatedBuyerSession | null> {
  const session = await getAuthenticatedAppSession();

  if (!session || session.role !== "buyer") {
    return null;
  }

  return {
    ...session,
    role: "buyer",
    user: session.user as User,
  };
}

export async function getAuthenticatedVendorSession(): Promise<AuthenticatedVendorSession | null> {
  const session = await getAuthenticatedAppSession();

  if (!session || session.role !== "vendor" || !session.vendorId) {
    return null;
  }

  return {
    ...session,
    role: "vendor",
    user: session.user as Vendor,
    vendorId: session.vendorId,
  };
}

export async function getAuthenticatedVendorApplicantSession(): Promise<AuthenticatedVendorApplicantSession | null> {
  const session = await getAuthenticatedAppSession();

  if (!session || session.role !== "vendor-applicant") {
    return null;
  }

  return {
    ...session,
    role: "vendor-applicant",
    user: session.user as User,
  };
}

export async function getAuthenticatedAdminSession(
  allowedRoles?: AdminRole[],
): Promise<AuthenticatedAdminSession | null> {
  const session = await getAuthenticatedAppSession();

  if (!session || session.role !== "admin" || !session.adminRole) {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(session.adminRole)) {
    return null;
  }

  return {
    ...session,
    role: "admin",
    user: session.user as User,
    adminRole: session.adminRole,
  };
}

export async function getAuthenticatedOperatorSession() {
  const vendorSession = await getAuthenticatedVendorSession();

  if (vendorSession) {
    return vendorSession;
  }

  return getAuthenticatedAdminSession(["operations-admin", "super-admin"]);
}

export function unauthorizedResponse(message: string) {
  return NextResponse.json(
    {
      data: null,
      meta: {},
      error: {
        code: "unauthorized",
        message,
        details: {},
      },
    },
    { status: 401 },
  );
}

export function unauthorizedBuyerResponse() {
  return unauthorizedResponse("You must be signed in as a buyer to continue.");
}

export function unauthorizedVendorResponse() {
  return unauthorizedResponse("You must be signed in as a vendor to continue.");
}

export function unauthorizedAdminResponse() {
  return unauthorizedResponse("You must be signed in as an authorized admin to continue.");
}

export function unauthorizedOperatorResponse() {
  return unauthorizedResponse("You must be signed in as a vendor or authorized admin to continue.");
}
