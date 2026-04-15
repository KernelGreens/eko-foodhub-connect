'use client'

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { useRoleAuthGuard } from '../../../lib/auth/use-role-auth-guard';
import { parseJsonResponse } from '../../../lib/http/parse-json-response';
import type { VendorApplicationSummary } from '../../../types';
import { useAuthStore } from '../../../stores/authStore';

type VendorApplicationPayload = {
  data?: VendorApplicationSummary | null;
  error?: {
    message?: string;
  } | null;
};

type VendorApplicationFormState = {
  name: string;
  email: string;
  phone: string;
  businessName: string;
  businessType: string;
  businessAddress: string;
  businessLicense: string;
  taxId: string;
  preferredHub: string;
  productCategories: string[];
  estimatedVolume: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  bvn: string;
};

const HUBS = [
  { id: 'idi-oro', name: 'Idi-Oro Hub' },
  { id: 'ajah', name: 'Ajah Hub' },
  { id: 'agege', name: 'Agege Hub' },
  { id: 'abule-ado', name: 'Abule Ado Hub' },
];

const BUSINESS_TYPES = [
  'Individual Farmer',
  'Cooperative Society',
  'Agricultural Company',
  'Food Processor',
  'Distributor',
  'Retailer',
];

const CATEGORIES = [
  'fruits',
  'vegetables',
  'grains',
  'tubers',
  'meat',
  'fish',
  'dairy',
  'spices',
  'herbs',
  'processed',
];

const EMPTY_FORM: VendorApplicationFormState = {
  name: '',
  email: '',
  phone: '',
  businessName: '',
  businessType: '',
  businessAddress: '',
  businessLicense: '',
  taxId: '',
  preferredHub: '',
  productCategories: [],
  estimatedVolume: '',
  bankName: '',
  accountName: '',
  accountNumber: '',
  bvn: '',
};

const EditVendorApplicationPage: React.FC = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const { isChecking } = useRoleAuthGuard({
    allowedRoles: ['vendor-applicant'],
  });
  const [formData, setFormData] = useState<VendorApplicationFormState>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadApplication() {
      try {
        const response = await fetch('/api/vendor/applications/me', {
          cache: 'no-store',
        });
        const payload = await parseJsonResponse<VendorApplicationPayload>(response);

        if (!response.ok || !payload?.data) {
          throw new Error(
            payload?.error?.message ?? 'Could not load your vendor application.',
          );
        }

        if (isMounted) {
          setFormData({
            name: payload.data.contactName ?? user?.name ?? '',
            email: payload.data.contactEmail ?? user?.email ?? '',
            phone: payload.data.contactPhone ?? user?.phone ?? '',
            businessName: payload.data.businessName,
            businessType: payload.data.applicationData.businessType ?? '',
            businessAddress: payload.data.applicationData.businessAddress ?? '',
            businessLicense: payload.data.applicationData.businessLicense ?? '',
            taxId: payload.data.applicationData.taxId ?? '',
            preferredHub: payload.data.applicationData.preferredHub ?? '',
            productCategories: payload.data.applicationData.productCategories ?? [],
            estimatedVolume: payload.data.applicationData.estimatedVolume ?? '',
            bankName: payload.data.applicationData.bankName ?? '',
            accountName: payload.data.applicationData.accountName ?? '',
            accountNumber: payload.data.applicationData.accountNumber ?? '',
            bvn: payload.data.applicationData.bvn ?? '',
          });
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
  }, [isChecking, user?.email, user?.name, user?.phone]);

  function toggleCategory(category: string) {
    setFormData((current) => ({
      ...current,
      productCategories: current.productCategories.includes(category)
        ? current.productCategories.filter((item) => item !== category)
        : [...current.productCategories, category],
    }));
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/vendor/applications/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          businessName: formData.businessName,
          businessType: formData.businessType,
          businessAddress: formData.businessAddress,
          businessLicense: formData.businessLicense,
          taxId: formData.taxId,
          preferredHub: formData.preferredHub,
          productCategories: formData.productCategories,
          estimatedVolume: formData.estimatedVolume,
          bankName: formData.bankName,
          accountName: formData.accountName,
          accountNumber: formData.accountNumber,
          bvn: formData.bvn,
        }),
      });
      const payload = await parseJsonResponse<VendorApplicationPayload>(response);

      if (!response.ok || !payload?.data) {
        throw new Error(
          payload?.error?.message ?? 'Could not update your vendor application.',
        );
      }

      router.push('/vendor-application');
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Could not update your vendor application.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isChecking || isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">Loading application editor...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 px-6 py-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Update vendor application
            </h1>
            <p className="mt-2 text-muted-foreground">
              Apply the requested changes, then resubmit for another review cycle.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/vendor-application">Back to status</Link>
          </Button>
        </div>

        {error ? (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Application details</CardTitle>
            <CardDescription>
              Email cannot be changed here because it is tied to your current account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Full name</label>
                <Input
                  value={formData.name}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Email</label>
                <Input value={formData.email} disabled />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Phone</label>
                <Input
                  value={formData.phone}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, phone: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Business name</label>
                <Input
                  value={formData.businessName}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      businessName: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Business type</label>
                <Select
                  value={formData.businessType}
                  onValueChange={(value) =>
                    setFormData((current) => ({ ...current, businessType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Preferred hub</label>
                <Select
                  value={formData.preferredHub}
                  onValueChange={(value) =>
                    setFormData((current) => ({ ...current, preferredHub: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select preferred hub" />
                  </SelectTrigger>
                  <SelectContent>
                    {HUBS.map((hub) => (
                      <SelectItem key={hub.id} value={hub.id}>
                        {hub.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Business address</label>
              <textarea
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.businessAddress}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    businessAddress: event.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Business license</label>
                <Input
                  value={formData.businessLicense}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      businessLicense: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Tax ID</label>
                <Input
                  value={formData.taxId}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, taxId: event.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Product categories</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((category) => (
                  <Button
                    key={category}
                    type="button"
                    variant={
                      formData.productCategories.includes(category)
                        ? 'default'
                        : 'outline'
                    }
                    size="sm"
                    onClick={() => toggleCategory(category)}
                    className="capitalize"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Estimated volume</label>
                <Select
                  value={formData.estimatedVolume}
                  onValueChange={(value) =>
                    setFormData((current) => ({
                      ...current,
                      estimatedVolume: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select estimated volume" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small (&lt; 1 ton)</SelectItem>
                    <SelectItem value="medium">Medium (1-10 tons)</SelectItem>
                    <SelectItem value="large">Large (10-50 tons)</SelectItem>
                    <SelectItem value="enterprise">Enterprise (&gt; 50 tons)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Bank name</label>
                <Input
                  value={formData.bankName}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      bankName: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Account name</label>
                <Input
                  value={formData.accountName}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      accountName: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Account number</label>
                <Input
                  value={formData.accountNumber}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      accountNumber: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">BVN</label>
                <Input
                  value={formData.bvn}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, bvn: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" asChild>
                <Link href="/vendor-application">Cancel</Link>
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Resubmitting...' : 'Resubmit Application'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EditVendorApplicationPage;
