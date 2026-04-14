import { NextResponse } from "next/server";

import { prisma } from "../../../../lib/db/prisma";
import { hashPassword } from "../../../../lib/auth/password";
import {
  buildSessionCookie,
  createBuyerSessionToken,
} from "../../../../lib/auth/session";

type RegisterBody = {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    if (!prisma) {
      return NextResponse.json(
        {
          data: null,
          meta: {},
          error: {
            code: "service_unavailable",
            message: "Database connection is required for registration.",
            details: {},
          },
        },
        { status: 503 },
      );
    }

    const body = (await request.json()) as RegisterBody;
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const phone = body.phone?.trim();
    const password = body.password ?? "";

    if (!name || !email || !phone || password.length < 8) {
      return NextResponse.json(
        {
          data: null,
          meta: {},
          error: {
            code: "validation_error",
            message: "Name, email, phone, and an 8+ character password are required.",
            details: {},
          },
        },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          data: null,
          meta: {},
          error: {
            code: "conflict",
            message: "An account with this email or phone already exists.",
            details: {},
          },
        },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        phone,
        displayName: name,
        passwordHash,
        buyerProfile: {
          create: {},
        },
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
  } catch (error) {
    console.error("Buyer registration failed.", error);

    return NextResponse.json(
      {
        data: null,
        meta: {},
        error: {
          code: "internal_error",
          message: "Registration failed due to a server error.",
          details: {},
        },
      },
      { status: 500 },
    );
  }
}
