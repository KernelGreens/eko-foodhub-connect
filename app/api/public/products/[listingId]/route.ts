import { NextResponse } from "next/server";

import { getPublicProductDetail } from "../../../../../lib/catalog/public-product-detail";

type RouteContext = {
  params: Promise<{
    listingId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { listingId } = await context.params;
  const productDetail = await getPublicProductDetail(listingId);

  if (!productDetail) {
    return NextResponse.json(
      {
        data: null,
        meta: {},
        error: {
          code: "not_found",
          message: "Product not found.",
          details: {},
        },
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: productDetail,
    meta: {},
    error: null,
  });
}
