import { NextResponse } from "next/server";

import {
  getAuthenticatedBuyerSession,
  unauthorizedBuyerResponse,
} from "../../../../../lib/auth/server";
import { buildCartQuote } from "../../../../../lib/checkout/cart-quote";
import type { Address } from "../../../../../types";

type QuoteRequestBody = {
  items?: Array<{
    productId: string;
    quantity: number;
  }>;
  deliveryAddress?: Address;
};

export async function POST(request: Request) {
  const session = await getAuthenticatedBuyerSession();

  if (!session) {
    return unauthorizedBuyerResponse();
  }

  try {
    const body = (await request.json()) as QuoteRequestBody;

    const items = Array.isArray(body.items) ? body.items : [];
    const deliveryAddress = body.deliveryAddress ?? {
      street: "",
      area: "",
      lga: "",
      state: "Lagos",
      landmark: "",
    };

    const quote = await buildCartQuote({
      items,
      deliveryAddress,
    });

    return NextResponse.json({
      data: quote,
      meta: {
        itemCount: quote.lineItems.length,
      },
      error: null,
    });
  } catch (error) {
    console.error("Failed to build cart quote.", error);

    return NextResponse.json(
      {
        data: null,
        meta: {},
        error: {
          code: "internal_error",
          message: "Unable to calculate cart quote.",
          details: {},
        },
      },
      { status: 500 },
    );
  }
}
