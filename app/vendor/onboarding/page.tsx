'use client'

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, Package, Settings, Store } from 'lucide-react';

import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { useRoleAuthGuard } from '../../../lib/auth/use-role-auth-guard';
import { parseJsonResponse } from '../../../lib/http/parse-json-response';

type VendorOnboardingSnapshot = {
  vendorId: string;
  businessName: string;
  activationReady: boolean;
  launchReady: boolean;
  currentHub: {
    code: string;
    name: string;
    area: string;
    lga: string;
  } | null;
  listingCount: number;
  steps: Array<{
    id: string;
    title: string;
    description: string;
    complete: boolean;
  }>;
};

type VendorOnboardingPayload = {
  data?: VendorOnboardingSnapshot | null;
  error?: {
    message?: string;
  } | null;
};

const VendorOnboardingPage: React.FC = () => {
  const { isChecking } = useRoleAuthGuard({
    allowedRoles: ['vendor'],
  });
  const [snapshot, setSnapshot] = useState<VendorOnboardingSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadOnboarding() {
      try {
        const response = await fetch('/api/vendor/onboarding', {
          cache: 'no-store',
        });
        const payload = await parseJsonResponse<VendorOnboardingPayload>(response);

        if (!response.ok) {
          throw new Error(
            payload?.error?.message ?? 'Could not load vendor onboarding status.',
          );
        }

        if (isMounted) {
          setSnapshot(payload?.data ?? null);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Could not load vendor onboarding status.',
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (!isChecking) {
      void loadOnboarding();
    }

    return () => {
      isMounted = false;
    };
  }, [isChecking]);

  if (isChecking || isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Loading onboarding checklist...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Vendor onboarding</h1>
          <p className="mt-1 text-muted-foreground">
            Complete the setup steps that turn an approved account into a launch-ready seller.
          </p>
        </div>
        <Badge variant={snapshot?.launchReady ? 'default' : 'secondary'}>
          {snapshot?.launchReady ? 'Launch ready' : 'Setup in progress'}
        </Badge>
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
          <CardTitle>{snapshot?.businessName ?? 'Vendor account'}</CardTitle>
          <CardDescription>
            {snapshot?.currentHub
              ? `Primary hub: ${snapshot.currentHub.name}${
                  snapshot.currentHub.area ? `, ${snapshot.currentHub.area}` : ''
                }`
              : 'Hub assignment will appear here once confirmed.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(snapshot?.steps ?? []).map((step) => (
            <div
              key={step.id}
              className="flex items-start gap-3 rounded-lg border border-border p-4"
            >
              {step.complete ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium text-foreground">{step.title}</p>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="h-5 w-5" />
              Business setup
            </CardTitle>
            <CardDescription>
              Review business profile, hub assignment, and payout information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/vendor/settings">Open vendor settings</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5" />
              First listing
            </CardTitle>
            <CardDescription>
              Add the first product listing so the vendor can move toward launch readiness.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/vendor/products">Go to products</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Store className="h-5 w-5" />
              Vendor workspace
            </CardTitle>
            <CardDescription>
              Continue into the dashboard while onboarding progresses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/vendor/dashboard">Open dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VendorOnboardingPage;
