import type { AdminRole } from "../../types";
import { prisma } from "../db/prisma";
import { hashPassword } from "./password";
import {
  DEV_BUYER_EMAIL,
  DEV_BUYER_PASSWORD,
  DEV_OPERATIONS_ADMIN_EMAIL,
  DEV_OPERATIONS_ADMIN_PASSWORD,
  DEV_SUPER_ADMIN_EMAIL,
  DEV_SUPER_ADMIN_PASSWORD,
  DEV_VENDOR_EMAIL,
  DEV_VENDOR_PASSWORD,
} from "./constants";

type DevAccountKind = "buyer" | "vendor" | AdminRole;

const DEV_VENDOR_ID = "1";
const DEV_HUB_ID = "dev-hub-idi-oro";

async function upsertRole(key: string, name: string, description: string) {
  return prisma?.role.upsert({
    where: {
      key,
    },
    update: {
      name,
      description,
    },
    create: {
      key,
      name,
      description,
    },
  });
}

async function ensureAdminRoleAssignment(userId: string, roleKey: AdminRole) {
  if (!prisma) {
    return;
  }

  const role = await prisma.role.findUnique({
    where: {
      key: roleKey,
    },
  });

  if (!role) {
    return;
  }

  const existingAssignment = await prisma.roleAssignment.findFirst({
    where: {
      userId,
      roleId: role.id,
      scopeType: "GLOBAL",
      scopeId: null,
    },
  });

  if (!existingAssignment) {
    await prisma.roleAssignment.create({
      data: {
        userId,
        roleId: role.id,
        scopeType: "GLOBAL",
      },
    });
  }
}

async function ensureBuyerAccount() {
  if (!prisma) {
    return null;
  }

  const passwordHash = await hashPassword(DEV_BUYER_PASSWORD);

  return prisma.user.upsert({
    where: {
      email: DEV_BUYER_EMAIL,
    },
    update: {
      displayName: "Demo Buyer",
      phone: "+234-800-000-0000",
      passwordHash,
      buyerProfile: {
        upsert: {
          update: {},
          create: {},
        },
      },
    },
    create: {
      email: DEV_BUYER_EMAIL,
      phone: "+234-800-000-0000",
      displayName: "Demo Buyer",
      passwordHash,
      buyerProfile: {
        create: {},
      },
    },
  });
}

async function ensureVendorAccount() {
  if (!prisma) {
    return null;
  }

  const passwordHash = await hashPassword(DEV_VENDOR_PASSWORD);

  const user = await prisma.user.upsert({
    where: {
      email: DEV_VENDOR_EMAIL,
    },
    update: {
      displayName: "Adebayo Farms",
      phone: "+234-801-234-5678",
      passwordHash,
    },
    create: {
      email: DEV_VENDOR_EMAIL,
      phone: "+234-801-234-5678",
      displayName: "Adebayo Farms",
      passwordHash,
    },
  });

  await prisma.hub.upsert({
    where: {
      id: DEV_HUB_ID,
    },
    update: {
      name: "Idi-Oro Hub",
      code: "idi-oro",
      addressLine: "15 Market Street",
      area: "Idi-Oro",
      lga: "Mushin",
      state: "Lagos",
      isActive: true,
    },
    create: {
      id: DEV_HUB_ID,
      name: "Idi-Oro Hub",
      code: "idi-oro",
      addressLine: "15 Market Street",
      area: "Idi-Oro",
      lga: "Mushin",
      state: "Lagos",
      isActive: true,
    },
  });

  await prisma.vendor.upsert({
    where: {
      id: DEV_VENDOR_ID,
    },
    update: {
      displayName: "Adebayo Fresh Farms",
      legalName: "Adebayo Fresh Farms",
      applicationStatus: "APPROVED",
      verificationStatus: "APPROVED",
    },
    create: {
      id: DEV_VENDOR_ID,
      displayName: "Adebayo Fresh Farms",
      legalName: "Adebayo Fresh Farms",
      applicationStatus: "APPROVED",
      verificationStatus: "APPROVED",
    },
  });

  const vendorUser = await prisma.vendorUser.findFirst({
    where: {
      userId: user.id,
      vendorId: DEV_VENDOR_ID,
    },
  });

  if (!vendorUser) {
    await prisma.vendorUser.create({
      data: {
        userId: user.id,
        vendorId: DEV_VENDOR_ID,
        title: "Vendor Admin",
      },
    });
  }

  const membership = await prisma.vendorHubMembership.findFirst({
    where: {
      vendorId: DEV_VENDOR_ID,
      hubId: DEV_HUB_ID,
    },
  });

  if (!membership) {
    await prisma.vendorHubMembership.create({
      data: {
        vendorId: DEV_VENDOR_ID,
        hubId: DEV_HUB_ID,
        isPrimary: true,
      },
    });
  }

  return user;
}

async function ensureAdminAccount(roleKey: AdminRole) {
  if (!prisma) {
    return null;
  }

  const isSuperAdmin = roleKey === "super-admin";
  const email = isSuperAdmin
    ? DEV_SUPER_ADMIN_EMAIL
    : DEV_OPERATIONS_ADMIN_EMAIL;
  const password = isSuperAdmin
    ? DEV_SUPER_ADMIN_PASSWORD
    : DEV_OPERATIONS_ADMIN_PASSWORD;
  const displayName = isSuperAdmin ? "Platform Super Admin" : "Platform Operations Admin";
  const phone = isSuperAdmin ? "+234-800-100-0001" : "+234-800-100-0000";

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: {
      email,
    },
    update: {
      displayName,
      phone,
      passwordHash,
      adminProfile: {
        upsert: {
          update: {
            department: isSuperAdmin ? "Platform Management" : "Marketplace Operations",
          },
          create: {
            department: isSuperAdmin ? "Platform Management" : "Marketplace Operations",
          },
        },
      },
    },
    create: {
      email,
      phone,
      displayName,
      passwordHash,
      adminProfile: {
        create: {
          department: isSuperAdmin ? "Platform Management" : "Marketplace Operations",
        },
      },
    },
  });

  await ensureAdminRoleAssignment(user.id, roleKey);

  return user;
}

export async function ensureDevelopmentAccount(email: string, password: string) {
  if (!prisma || process.env.NODE_ENV === "production") {
    return null;
  }

  await Promise.all([
    upsertRole(
      "operations-admin",
      "Operations Admin",
      "Marketplace operator with scoped operational controls.",
    ),
    upsertRole(
      "super-admin",
      "Super Admin",
      "Platform-wide administrator with global control.",
    ),
  ]);

  let kind: DevAccountKind | null = null;

  if (email === DEV_BUYER_EMAIL && password === DEV_BUYER_PASSWORD) {
    kind = "buyer";
  } else if (email === DEV_VENDOR_EMAIL && password === DEV_VENDOR_PASSWORD) {
    kind = "vendor";
  } else if (
    email === DEV_OPERATIONS_ADMIN_EMAIL &&
    password === DEV_OPERATIONS_ADMIN_PASSWORD
  ) {
    kind = "operations-admin";
  } else if (
    email === DEV_SUPER_ADMIN_EMAIL &&
    password === DEV_SUPER_ADMIN_PASSWORD
  ) {
    kind = "super-admin";
  }

  switch (kind) {
    case "buyer":
      return ensureBuyerAccount();
    case "vendor":
      return ensureVendorAccount();
    case "operations-admin":
    case "super-admin":
      return ensureAdminAccount(kind);
    default:
      return null;
  }
}
