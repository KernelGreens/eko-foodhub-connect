import { NextResponse } from "next/server";

import type { AdminRole } from "../../../../types";
import { prisma } from "../../../../lib/db/prisma";
import { ensureDevelopmentAccount } from "../../../../lib/auth/dev-accounts";
import { verifyPassword } from "../../../../lib/auth/password";
import {
  buildSessionCookie,
  createAppSessionToken,
} from "../../../../lib/auth/session";

type LoginBody = {
  email?: string;
  password?: string;
  role?: "buyer" | "vendor" | "admin";
};

type LoginUserRecord = {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string;
  createdAt: Date;
  passwordHash: string | null;
  buyerProfile: { id: string } | null;
  adminProfile: { id: string } | null;
  roleAssignments: Array<{
    role: {
      key: string;
    };
  }>;
  vendorUsers: Array<{
    vendorId: string;
    vendor: {
      id: string;
      displayName: string;
      applicationStatus: string;
      verificationStatus: string;
      hubMemberships: Array<{
        isPrimary: boolean;
        hub: {
          code: string;
          addressLine: string;
          area: string;
          lga: string;
        };
      }>;
    };
  }>;
};

function resolveAdminRole(user: LoginUserRecord): AdminRole | null {
  const roleKeys = user.roleAssignments.map((assignment) => assignment.role.key);

  if (roleKeys.includes("super-admin")) {
    return "super-admin";
  }

  if (roleKeys.includes("operations-admin")) {
    return "operations-admin";
  }

  return null;
}

async function findLoginUser(email: string) {
  if (!prisma) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      email,
    },
    include: {
      buyerProfile: true,
      adminProfile: true,
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
            },
          },
        },
      },
    },
  }) as Promise<LoginUserRecord | null>;
}

function buildLoginContext(
  user: LoginUserRecord,
  preferredRole?: "buyer" | "vendor" | "admin",
) {
  const adminRole = resolveAdminRole(user);
  const firstVendorUser = user.vendorUsers[0];

  const contexts = [
    adminRole
      ? {
          role: "admin" as const,
          adminRole,
        }
      : null,
    firstVendorUser
      ? {
          role: "vendor" as const,
          vendorId: firstVendorUser.vendorId,
        }
      : null,
    user.buyerProfile
      ? {
          role: "buyer" as const,
        }
      : null,
  ].filter(Boolean) as Array<
    | { role: "buyer" }
    | { role: "vendor"; vendorId: string }
    | { role: "admin"; adminRole: AdminRole }
  >;

  if (preferredRole) {
    const preferredContext = contexts.find(
      (context) => context.role === preferredRole,
    );

    if (preferredContext) {
      return preferredContext;
    }
  }

  return contexts[0] ?? null;
}

function buildClientUser(
  user: LoginUserRecord,
  context:
    | { role: "buyer" }
    | { role: "vendor"; vendorId: string }
    | { role: "admin"; adminRole: AdminRole },
) {
  if (context.role === "buyer") {
    return {
      id: user.id,
      email: user.email ?? "",
      name: user.displayName,
      phone: user.phone ?? "",
      role: "buyer" as const,
      createdAt: user.createdAt,
      isVerified: true,
    };
  }

  if (context.role === "vendor") {
    const vendorUser = user.vendorUsers.find(
      (candidate) => candidate.vendorId === context.vendorId,
    );
    const primaryMembership =
      vendorUser?.vendor.hubMemberships.find((membership) => membership.isPrimary) ??
      vendorUser?.vendor.hubMemberships[0];
    const hubCode = primaryMembership?.hub.code;

    return {
      id: context.vendorId,
      email: user.email ?? "",
      name: user.displayName,
      phone: user.phone ?? "",
      role: "vendor" as const,
      createdAt: user.createdAt,
      isVerified:
        vendorUser?.vendor.applicationStatus === "APPROVED" &&
        vendorUser.vendor.verificationStatus === "APPROVED",
      businessName: vendorUser?.vendor.displayName ?? "Vendor",
      businessAddress: primaryMembership
        ? `${primaryMembership.hub.addressLine}, ${primaryMembership.hub.area}, ${primaryMembership.hub.lga}`
        : "Lagos, Nigeria",
      hubLocation:
        hubCode === "ajah" ||
        hubCode === "agege" ||
        hubCode === "abule-ado" ||
        hubCode === "idi-oro"
          ? hubCode
          : "idi-oro",
      vendorId: context.vendorId,
      rating: 4.8,
      totalSales: 2500000,
      isActive:
        vendorUser?.vendor.applicationStatus === "APPROVED" &&
        vendorUser.vendor.verificationStatus === "APPROVED",
    };
  }

  return {
    id: user.id,
    email: user.email ?? "",
    name: user.displayName,
    phone: user.phone ?? "",
    role: "admin" as const,
    adminRole: context.adminRole,
    createdAt: user.createdAt,
    isVerified: true,
  };
}

export async function POST(request: Request) {
  try {
    if (!prisma) {
      return NextResponse.json(
        {
          data: null,
          meta: {},
          error: {
            code: "service_unavailable",
            message: "Database connection is required for login.",
            details: {},
          },
        },
        { status: 503 },
      );
    }

    const body = (await request.json()) as LoginBody;
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json(
        {
          data: null,
          meta: {},
          error: {
            code: "validation_error",
            message: "Email and password are required.",
            details: {},
          },
        },
        { status: 400 },
      );
    }

    let user = await findLoginUser(email);

    if (!user) {
      await ensureDevelopmentAccount(email, password);
      user = await findLoginUser(email);
    }

    if (!user?.passwordHash) {
      return NextResponse.json(
        {
          data: null,
          meta: {},
          error: {
            code: "invalid_credentials",
            message: "Invalid email or password.",
            details: {},
          },
        },
        { status: 401 },
      );
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        {
          data: null,
          meta: {},
          error: {
            code: "invalid_credentials",
            message: "Invalid email or password.",
            details: {},
          },
        },
        { status: 401 },
      );
    }

    const loginContext = buildLoginContext(user, body.role);

    if (!loginContext) {
      return NextResponse.json(
        {
          data: null,
          meta: {},
          error: {
            code: "unauthorized",
            message: "This account does not have an active marketplace role.",
            details: {},
          },
        },
        { status: 403 },
      );
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });

    const token = createAppSessionToken({
      userId: user.id,
      email: user.email ?? email,
      name: user.displayName,
      role: loginContext.role,
      ...(loginContext.role === "vendor"
        ? {
            vendorId: loginContext.vendorId,
          }
        : {}),
      ...(loginContext.role === "admin"
        ? {
            adminRole: loginContext.adminRole,
          }
        : {}),
    });

    const response = NextResponse.json({
      data: {
        user: buildClientUser(user, loginContext),
      },
      meta: {},
      error: null,
    });

    response.cookies.set(buildSessionCookie(token));

    return response;
  } catch (error) {
    console.error("Login failed.", error);

    return NextResponse.json(
      {
        data: null,
        meta: {},
        error: {
          code: "internal_error",
          message: "Login failed due to a server error.",
          details: {},
        },
      },
      { status: 500 },
    );
  }
}
