import { NextRequest, NextResponse } from "next/server";

import { getPublicProducts } from "../../../../lib/catalog/public-products";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  try {
    const products = await getPublicProducts({
      q: searchParams.get("q") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      vendorId: searchParams.get("vendorId") ?? undefined,
    });

    return NextResponse.json({
      data: products,
      meta: {
        count: products.length,
      },
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load products.";

    return NextResponse.json(
      {
        data: null,
        meta: {},
        error: {
          code: "internal_error",
          message,
          details: {},
        },
      },
      { status: 500 },
    );
  }
}
