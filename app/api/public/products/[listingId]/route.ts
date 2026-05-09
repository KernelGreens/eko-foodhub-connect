import { NextResponse } from "next/server";

import { getPublicProductDetail } from "../../../../../lib/catalog/public-product-detail";

type RouteContext = {
  params: Promise<{
    listingId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { listingId } = await context.params;

  let productDetail;

  try {
    productDetail = await getPublicProductDetail(listingId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load product.";

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
