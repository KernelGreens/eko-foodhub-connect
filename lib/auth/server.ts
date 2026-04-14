import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { prisma } from "../db/prisma";
import type { User } from "../../types";
import { AUTH_SESSION_COOKIE } from "./constants";
import { verifyBuyerSessionToken } from "./session";

export type AuthenticatedBuyerSession = {
  userId: string;
  user: User;
};

function mapBuyerToClientUser(user: {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string;
  createdAt: Date;
}) {
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

export async function getAuthenticatedBuyerSession(): Promise<AuthenticatedBuyerSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
  const payload = verifyBuyerSessionToken(token);

  if (!payload || payload.role !== "buyer" || !prisma) {
    return null;
  }

  const user = await prisma.user.findFirst({
    where: {
      id: payload.userId,
      email: payload.email,
      buyerProfile: {
        isNot: null,
      },
    },
    include: {
      buyerProfile: true,
    },
  });

  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    user: mapBuyerToClientUser(user),
  };
}

export function unauthorizedBuyerResponse() {
  return NextResponse.json(
    {
      data: null,
      meta: {},
      error: {
        code: "unauthorized",
        message: "You must be signed in as a buyer to continue.",
        details: {},
      },
    },
    { status: 401 },
  );
}
