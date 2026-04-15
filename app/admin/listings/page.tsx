'use client'

import React, { useEffect, useMemo, useState } from 'react';

import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { parseJsonResponse } from '../../../lib/http/parse-json-response';
import type { VendorListingSummary } from '../../../types';
import { formatCurrency } from '../../../utils/format';

type ListingsPayload = {
  data?: VendorListingSummary[] | null;
  error?: {
    message?: string;
  } | null;
};

type ListingModerationPayload = {
  data?: VendorListingSummary | null;
  error?: {
    message?: string;
  } | null;
};

function formatPublishStatus(status: VendorListingSummary['publishStatus']) {
  return status.replace('-', ' ');
}

const AdminListingsPage: React.FC = () => {
  const [listings, setListings] = useState<VendorListingSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadListings() {
      try {
        const response = await fetch('/api/admin/listings', {
          cache: 'no-store',
        });
        const payload = await parseJsonResponse<ListingsPayload>(response);

        if (!response.ok) {
          throw new Error(
            payload?.error?.message ?? 'Could not load listing moderation queue.',
          );
        }

        if (isMounted) {
          setListings(payload?.data ?? []);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Could not load listing moderation queue.',
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadListings();

    return () => {
      isMounted = false;
    };
  }, []);

  const pendingCount = useMemo(
    () => listings.filter((listing) => listing.publishStatus === 'pending-review').length,
    [listings],
  );

  async function handleModeration(
    listingId: string,
    action: 'publish' | 'unpublish' | 'return-to-draft',
  ) {
    setUpdatingId(listingId);
    setError('');

    try {
      const response = await fetch(`/api/admin/listings/${listingId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });
      const payload = await parseJsonResponse<ListingModerationPayload>(response);

      if (!response.ok || !payload?.data) {
        throw new Error(
          payload?.error?.message ?? 'Could not complete listing moderation action.',
        );
      }

      setListings((current) =>
        current.map((listing) =>
          listing.id === payload.data!.id ? payload.data! : listing,
        ),
      );
    } catch (moderationError) {
      setError(
        moderationError instanceof Error
          ? moderationError.message
          : 'Could not complete listing moderation action.',
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Listing moderation queue</CardTitle>
          <CardDescription>
            {pendingCount} listing{pendingCount === 1 ? '' : 's'} waiting for review
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vendor listings</CardTitle>
          <CardDescription>
            Publish or unpublish vendor listings to control marketplace visibility.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="border-b border-border p-4 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <div className="p-6">
              <p className="text-muted-foreground">Loading listings...</p>
            </div>
          ) : listings.length === 0 ? (
            <div className="p-6">
              <p className="text-muted-foreground">No vendor listings found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Listing
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Publish Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {listings.map((listing) => (
                    <tr key={listing.id}>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-foreground">{listing.name}</p>
                          <p className="text-sm capitalize text-muted-foreground">
                            {listing.category}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {listing.vendorName}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {formatCurrency(listing.price)} / {listing.unit}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {listing.stock} {listing.unit}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="capitalize">
                          {formatPublishStatus(listing.publishStatus)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {listing.publishStatus === 'pending-review' ? (
                            <Button
                              size="sm"
                              disabled={updatingId === listing.id}
                              onClick={() => handleModeration(listing.id, 'publish')}
                            >
                              Publish
                            </Button>
                          ) : null}

                          {listing.publishStatus === 'published' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={updatingId === listing.id}
                              onClick={() => handleModeration(listing.id, 'unpublish')}
                            >
                              Unpublish
                            </Button>
                          ) : null}

                          {listing.publishStatus === 'pending-review' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={updatingId === listing.id}
                              onClick={() =>
                                handleModeration(listing.id, 'return-to-draft')
                              }
                            >
                              Return to Draft
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminListingsPage;
