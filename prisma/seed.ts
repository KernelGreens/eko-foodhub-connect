import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../lib/generated/prisma/client";
import type { AdminRole } from "../types";
import { hashPassword } from "../lib/auth/password";

type SeedAdminInput = {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  role: AdminRole;
  department?: string;
};

const ADMIN_ROLES: Record<
  AdminRole,
  { name: string; description: string; department: string }
> = {
  "operations-admin": {
    name: "Operations Admin",
    description: "Marketplace operator with scoped operational controls.",
    department: "Marketplace Operations",
  },
  "super-admin": {
    name: "Super Admin",
    description: "Platform-wide administrator with global control.",
    department: "Platform Management",
  },
};

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required to seed admin users.`);
  }

  return value;
}

function optionalEnv(name: string) {
  const value = process.env[name]?.trim();

  return value || undefined;
}

function readJsonAdmins() {
  const rawAdmins = optionalEnv("SEED_ADMINS");

  if (!rawAdmins) {
    return [];
  }

  const parsedAdmins = JSON.parse(rawAdmins) as SeedAdminInput[];

  if (!Array.isArray(parsedAdmins)) {
    throw new Error("SEED_ADMINS must be a JSON array.");
  }

  return parsedAdmins;
}

function readNamedAdmin(prefix: string, role: AdminRole) {
  const email = optionalEnv(`${prefix}_EMAIL`);
  const password = optionalEnv(`${prefix}_PASSWORD`);

  if (!email && !password) {
    return null;
  }

  if (!email || !password) {
    throw new Error(`${prefix}_EMAIL and ${prefix}_PASSWORD must be set together.`);
  }

  return {
    email,
    password,
    name: optionalEnv(`${prefix}_NAME`),
    phone: optionalEnv(`${prefix}_PHONE`),
    role,
    department: optionalEnv(`${prefix}_DEPARTMENT`),
  };
}

function readSeedAdmins() {
  const admins = [
    ...readJsonAdmins(),
    readNamedAdmin("SUPER_ADMIN", "super-admin"),
    readNamedAdmin("OPERATIONS_ADMIN", "operations-admin"),
    readNamedAdmin(
      "ADMIN",
      (optionalEnv("ADMIN_ROLE") as AdminRole | undefined) ?? "operations-admin",
    ),
  ].filter(Boolean) as SeedAdminInput[];

  if (admins.length === 0 && optionalEnv("ALLOW_EMPTY_ADMIN_SEED") !== "true") {
    throw new Error(
      "No admin users configured. Set SEED_ADMINS, SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD, or OPERATIONS_ADMIN_EMAIL/OPERATIONS_ADMIN_PASSWORD.",
    );
  }

  return admins;
}

function normalizeAdminInput(admin: SeedAdminInput) {
  const email = admin.email?.trim().toLowerCase();
  const password = admin.password;

  if (!email) {
    throw new Error("Each seeded admin requires an email.");
  }

  if (!password || password.length < 8) {
    throw new Error(`Seeded admin ${email} requires a password of at least 8 characters.`);
  }

  if (!Object.keys(ADMIN_ROLES).includes(admin.role)) {
    throw new Error(
      `Seeded admin ${email} has unsupported role "${admin.role}". Use operations-admin or super-admin.`,
    );
  }

  return {
    ...admin,
    email,
    displayName: admin.name?.trim() || ADMIN_ROLES[admin.role].name,
    department: admin.department?.trim() || ADMIN_ROLES[admin.role].department,
    phone: admin.phone?.trim() || undefined,
  };
}

async function ensureRole(prisma: PrismaClient, roleKey: AdminRole) {
  const role = ADMIN_ROLES[roleKey];

  return prisma.role.upsert({
    where: {
      key: roleKey,
    },
    update: {
      name: role.name,
      description: role.description,
    },
    create: {
      key: roleKey,
      name: role.name,
      description: role.description,
    },
  });
}

async function ensureAdminRoleAssignment(
  prisma: PrismaClient,
  userId: string,
  roleId: string,
) {
  const existingAssignment = await prisma.roleAssignment.findFirst({
    where: {
      userId,
      roleId,
      scopeType: "GLOBAL",
      scopeId: null,
    },
  });

  if (existingAssignment) {
    return;
  }

  await prisma.roleAssignment.create({
    data: {
      userId,
      roleId,
      scopeType: "GLOBAL",
    },
  });
}

async function seedAdmin(prisma: PrismaClient, adminInput: SeedAdminInput) {
  const admin = normalizeAdminInput(adminInput);
  const role = await ensureRole(prisma, admin.role);
  const passwordHash = await hashPassword(admin.password);

  const user = await prisma.user.upsert({
    where: {
      email: admin.email,
    },
    update: {
      displayName: admin.displayName,
      ...(admin.phone ? { phone: admin.phone } : {}),
      passwordHash,
      accountStatus: "ACTIVE",
      isEmailVerified: true,
      adminProfile: {
        upsert: {
          update: {
            department: admin.department,
          },
          create: {
            department: admin.department,
          },
        },
      },
    },
    create: {
      email: admin.email,
      phone: admin.phone,
      displayName: admin.displayName,
      passwordHash,
      accountStatus: "ACTIVE",
      isEmailVerified: true,
      adminProfile: {
        create: {
          department: admin.department,
        },
      },
    },
  });

  await ensureAdminRoleAssignment(prisma, user.id, role.id);

  return {
    email: user.email,
    role: admin.role,
  };
}

async function main() {
  const databaseUrl = requiredEnv("DATABASE_URL");
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

  try {
    await Promise.all([
      ensureRole(prisma, "operations-admin"),
      ensureRole(prisma, "super-admin"),
    ]);

    const seededAdmins = [];

    for (const admin of readSeedAdmins()) {
      seededAdmins.push(await seedAdmin(prisma, admin));
    }

    if (seededAdmins.length === 0) {
      console.log("Admin roles seeded. No admin users were configured.");
      return;
    }

    for (const admin of seededAdmins) {
      console.log(`Seeded ${admin.role}: ${admin.email}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
