import { NextResponse } from "next/server";

import { prisma } from "../../../../lib/db/prisma";
import { DEV_BUYER_EMAIL, DEV_BUYER_PASSWORD } from "../../../../lib/auth/constants";
import { hashPassword, verifyPassword } from "../../../../lib/auth/password";
import {
  buildSessionCookie,
  createBuyerSessionToken,
} from "../../../../lib/auth/session";

type LoginBody = {
  email?: string;
  password?: string;
};

async function getOrCreateBuyerForLogin(email: string, password: string) {
  if (!prisma) {
    return null;
  }

  let user = await prisma.user.findFirst({
    where: {
      email,
      buyerProfile: {
        isNot: null,
      },
    },
    include: {
      buyerProfile: true,
    },
  });

  if (
    !user &&
    process.env.NODE_ENV !== "production" &&
    email === DEV_BUYER_EMAIL &&
    password === DEV_BUYER_PASSWORD
  ) {
    user = await prisma.user.create({
      data: {
        email,
        phone: "+234-800-000-0000",
        displayName: "Demo Buyer",
        passwordHash: await hashPassword(password),
        buyerProfile: {
          create: {},
        },
      },
      include: {
        buyerProfile: true,
      },
    });
  }

  return user;
}

export async function POST(request: Request) {
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

  const user = await getOrCreateBuyerForLogin(email, password);

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

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      lastLoginAt: new Date(),
    },
  });

  const token = createBuyerSessionToken({
    userId: user.id,
    email: user.email ?? email,
    name: user.displayName,
    role: "buyer",
  });

  const response = NextResponse.json({
    data: {
      user: {
        id: user.id,
        email: user.email ?? email,
        name: user.displayName,
        phone: user.phone ?? "",
        role: "buyer" as const,
        createdAt: user.createdAt,
        isVerified: true,
      },
    },
    meta: {},
    error: null,
  });

  response.cookies.set(buildSessionCookie(token));

  return response;
}
