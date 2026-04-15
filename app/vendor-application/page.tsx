'use client'

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { useRoleAuthGuard } from '../../lib/auth/use-role-auth-guard';
import { parseJsonResponse } from '../../lib/http/parse-json-response';
import { useAuthStore } from '../../stores/authStore';
import type { VendorApplicationSummary } from '../../types';

type VendorApplicationPayload = {
  data?: VendorApplicationSummary | null;
  error?: {
    message?: string;
  } | null;
};

function getStatusBadgeVariant(status?: VendorApplicationSummary['applicationStatus']) {
  switch (status) {
    case 'approved':
      return 'default';
    case 'rejected':
      return 'destructive';
    case 'under-review':
      return 'secondary';
    default:
      return 'outline';
  }
}

const VendorApplicationPage: React.FC = () => {
  const { user } = useAuthStore();
  const { isChecking } = useRoleAuthGuard({
    allowedRoles: ['vendor-applicant', 'vendor'],
  });
  const [application, setApplication] = useState<VendorApplicationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadApplication() {
      try {
        const response = await fetch('/api/vendor/applications/me', {
          cache: 'no-store',
        });
        const payload = await parseJsonResponse<VendorApplicationPayload>(response);

        if (!response.ok) {
          throw new Error(
            payload?.error?.message ?? 'Could not load your vendor application.',
          );
        }

        if (isMounted) {
          setApplication(payload?.data ?? null);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Could not load your vendor application.',
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (!isChecking) {
      void loadApplication();
    }

    return () => {
      isMounted = false;
    };
  }, [isChecking]);

  const isApprovedVendor = user?.role === 'vendor';
  const title = useMemo(() => {
    if (isApprovedVendor) {
      return 'Vendor account approved';
    }

    return 'Vendor application status';
  }, [isApprovedVendor]);

  if (isChecking || isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">Loading your application...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 px-6 py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          <p className="mt-2 text-muted-foreground">
            Track your onboarding progress and know when your vendor workspace is ready.
          </p>
        </div>

        {error ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>{application?.businessName ?? 'Vendor Application'}</CardTitle>
                <CardDescription>
                  Preferred hub: {application?.preferredHubName ?? 'Pending hub assignment'}
                </CardDescription>
              </div>
              <Badge variant={getStatusBadgeVariant(application?.applicationStatus)}>
                {application?.applicationStatus ?? 'submitted'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-foreground">Contact person</p>
                <p className="text-sm text-muted-foreground">
                  {application?.contactName ?? user?.name}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Contact email</p>
                <p className="text-sm text-muted-foreground">
                  {application?.contactEmail ?? user?.email}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Business type</p>
                <p className="text-sm text-muted-foreground">
                  {application?.applicationData.businessType ?? 'Not provided'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Estimated volume</p>
                <p className="text-sm text-muted-foreground">
                  {application?.applicationData.estimatedVolume ?? 'Not provided'}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground">Categories</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {application?.applicationData.productCategories?.length ? (
                  application.applicationData.productCategories.map((category) => (
                    <Badge key={category} variant="outline" className="capitalize">
                      {category}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No categories submitted.</p>
                )}
              </div>
            </div>

            {application?.rejectionReason ? (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <p className="text-sm font-medium text-destructive">Review feedback</p>
                <p className="mt-1 text-sm text-destructive/90">
                  {application.rejectionReason}
                </p>
              </div>
            ) : null}

            <div className="rounded-lg bg-emerald-50 p-4">
              <p className="text-sm font-medium text-emerald-900">What happens next</p>
              <p className="mt-1 text-sm text-emerald-800">
                Operations admin reviews your submission, assigns the hub relationship,
                and activates your vendor workspace after approval.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {isApprovedVendor ? (
                <Button asChild>
                  <Link href="/vendor/dashboard">Open Vendor Dashboard</Link>
                </Button>
              ) : (
                <Button variant="outline" asChild>
                  <Link href="/">Browse Marketplace</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VendorApplicationPage;
