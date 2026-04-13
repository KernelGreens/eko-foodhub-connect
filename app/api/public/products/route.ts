import { NextRequest, NextResponse } from "next/server";

import { getPublicProducts } from "../../../../lib/catalog/public-products";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

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
}
