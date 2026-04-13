'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, Clock, Leaf, ShoppingCart, Store } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { useCartStore } from '../../../stores/cartStore';
import type { Product } from '../../../types';
import { formatCurrency } from '../../../utils/format';

type PublicProductDetail = {
  product: Product;
  vendorName: string;
  deliveryEstimate: string;
  hubName?: string;
};

function hydrateProduct(product: Product): Product {
  return {
    ...product,
    createdAt: new Date(product.createdAt),
    updatedAt: new Date(product.updatedAt),
    harvestDate: product.harvestDate ? new Date(product.harvestDate) : undefined,
    expiryDate: product.expiryDate ? new Date(product.expiryDate) : undefined,
  };
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const { addItem } = useCartStore();
  const [detail, setDetail] = useState<PublicProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadProductDetail() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(`/api/public/products/${params.id}`);

        if (!response.ok) {
          throw new Error('Unable to load product detail.');
        }

        const payload = await response.json();
        const incomingDetail = payload?.data as PublicProductDetail | null;

        if (!incomingDetail) {
          throw new Error('Product detail response was empty.');
        }

        if (!isMounted) {
          return;
        }

        setDetail({
          ...incomingDetail,
          product: hydrateProduct(incomingDetail.product),
        });
      } catch (error) {
        console.error(error);

        if (!isMounted) {
          return;
        }

        setErrorMessage('We could not load this product right now.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadProductDetail();

    return () => {
      isMounted = false;
    };
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-6 w-40 rounded bg-gray-200" />
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="aspect-[4/3] rounded-2xl bg-gray-200" />
            <div className="space-y-4">
              <div className="h-8 w-2/3 rounded bg-gray-200" />
              <div className="h-4 w-full rounded bg-gray-200" />
              <div className="h-4 w-5/6 rounded bg-gray-200" />
              <div className="h-12 w-40 rounded bg-gray-200" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <div className="flex justify-center">
              <AlertCircle className="w-10 h-10 text-amber-500" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">Product unavailable</h1>
            <p className="text-gray-600">
              {errorMessage ?? 'This product could not be found.'}
            </p>
            <Link href="/products">
              <Button>Back to products</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { product } = detail;
  const imageSrc = product.images[activeImage] ?? product.images[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-6">
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to products
        </Link>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100">
            <Image
              fill
              src={imageSrc}
              alt={product.name}
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 60vw"
            />
          </div>

          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {product.images.map((image, index) => (
                <button
                  key={`${product.id}-image-${index}`}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={`relative aspect-square overflow-hidden rounded-xl border ${
                    activeImage === index ? 'border-emerald-600' : 'border-gray-200'
                  }`}
                >
                  <Image
                    fill
                    src={image}
                    alt={`${product.name} preview ${index + 1}`}
                    className="object-cover"
                    sizes="120px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="capitalize">
                {product.category}
              </Badge>
              {product.isOrganic && (
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                  <Leaf className="w-3 h-3 mr-1" />
                  Organic
                </Badge>
              )}
              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 capitalize">
                <Clock className="w-3 h-3 mr-1" />
                {product.freshness.replace('-', ' ')}
              </Badge>
            </div>

            <div>
              <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
              <p className="mt-3 text-base leading-7 text-gray-600">{product.description}</p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-emerald-700">
                  {formatCurrency(product.price)}
                </span>
                <span className="pb-1 text-sm text-gray-600">per {product.unit}</span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Minimum order</p>
                  <p className="font-medium text-gray-900">
                    {product.minOrder} {product.unit}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Available stock</p>
                  <p className="font-medium text-gray-900">
                    {product.stock} {product.unit}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Store className="w-4 h-4 text-emerald-700" />
                    Vendor
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-gray-600">
                  <p className="font-medium text-gray-900">{detail.vendorName}</p>
                  {detail.hubName && <p>Hub: {detail.hubName}</p>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-700" />
                    Delivery
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-gray-600">
                  <p>{detail.deliveryEstimate}</p>
                  <p>Lagos-only coverage in Phase 1.</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {product.bulkPricing && product.bulkPricing.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bulk pricing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {product.bulkPricing.map((tier) => (
                    <div
                      key={`${product.id}-bulk-${tier.minQuantity}`}
                      className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {tier.minQuantity}+ {product.unit}
                        </p>
                        <p className="text-sm text-gray-500">
                          Save {tier.discount.toFixed(2)}%
                        </p>
                      </div>
                      <p className="font-semibold text-emerald-700">
                        {formatCurrency(tier.price)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={!product.isAvailable || product.stock === 0}
              onClick={() => addItem(product, product.minOrder)}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Add Minimum Order
            </Button>
            <Button size="lg" variant="outline" disabled>
              Report Product Issue
            </Button>
          </div>

          <p className="text-sm text-gray-500">
            The report-issue workflow is planned next; this button is intentionally not active yet.
          </p>
        </div>
      </div>
    </div>
  );
}
