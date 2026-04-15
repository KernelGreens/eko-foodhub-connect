'use client'

import React, { useEffect, useState } from 'react';
import {
  Bell,
  Building,
  CreditCard,
  Globe,
  Mail,
  MapPin,
  Phone,
  Save,
  Settings as SettingsIcon,
  Shield,
  User,
} from 'lucide-react';

import { Badge } from '../../../components/ui/badge';
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
import { useAuthStore } from '../../../stores/authStore';

type VendorSettingsSnapshot = {
  profile: {
    name: string;
    email: string;
    phone: string;
    title: string;
  };
  business: {
    businessName: string;
    legalName: string;
    businessType: string;
    businessAddress: string;
    businessLicense: string;
    taxId: string;
    currentHub: {
      code: string;
      name: string;
      area: string;
      lga: string;
    } | null;
  };
  banking: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    bvn: string;
    currencyCode: string;
  };
  verification: {
    emailVerified: boolean;
    phoneVerified: boolean;
    businessVerified: boolean;
    hubAssigned: boolean;
  };
};

type VendorSettingsPayload = {
  data?: VendorSettingsSnapshot | null;
  error?: {
    message?: string;
  } | null;
};

type ActiveTab = 'profile' | 'business' | 'banking' | 'more';

type ProfileFormState = VendorSettingsSnapshot['profile'];
type BusinessFormState = VendorSettingsSnapshot['business'];
type BankingFormState = VendorSettingsSnapshot['banking'];

const BUSINESS_TYPES = [
  'Individual Farmer',
  'Cooperative Society',
  'Agricultural Company',
  'Food Processor',
  'Distributor',
  'Retailer',
];

const BANK_OPTIONS = [
  'First Bank Nigeria',
  'GTBank',
  'Access Bank',
  'UBA',
  'Zenith Bank',
  'Fidelity Bank',
];

function getStatusBadge(complete: boolean) {
  return complete ? 'default' : 'secondary';
}

const VendorSettingsPage: React.FC = () => {
  const { initialize } = useAuthStore();
  const { isChecking } = useRoleAuthGuard({
    allowedRoles: ['vendor'],
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>('profile');
  const [snapshot, setSnapshot] = useState<VendorSettingsSnapshot | null>(null);
  const [profileData, setProfileData] = useState<ProfileFormState>({
    name: '',
    email: '',
    phone: '',
    title: '',
  });
  const [businessData, setBusinessData] = useState<BusinessFormState>({
    businessName: '',
    legalName: '',
    businessType: '',
    businessAddress: '',
    businessLicense: '',
    taxId: '',
    currentHub: null,
  });
  const [bankingData, setBankingData] = useState<BankingFormState>({
    bankName: '',
    accountName: '',
    accountNumber: '',
    bvn: '',
    currencyCode: 'NGN',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  function hydrateForms(data: VendorSettingsSnapshot) {
    setSnapshot(data);
    setProfileData(data.profile);
    setBusinessData(data.business);
    setBankingData(data.banking);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      try {
        const response = await fetch('/api/vendor/settings', {
          cache: 'no-store',
        });
        const payload = await parseJsonResponse<VendorSettingsPayload>(response);

        if (!response.ok || !payload?.data) {
          throw new Error(
            payload?.error?.message ?? 'Could not load vendor settings right now.',
          );
        }

        if (isMounted) {
          hydrateForms(payload.data);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Could not load vendor settings right now.',
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (!isChecking) {
      void loadSettings();
    }

    return () => {
      isMounted = false;
    };
  }, [isChecking]);

  async function handleSave() {
    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/vendor/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: profileData.name,
          phone: profileData.phone,
          businessName: businessData.businessName,
          legalName: businessData.legalName,
          businessType: businessData.businessType,
          businessAddress: businessData.businessAddress,
          businessLicense: businessData.businessLicense,
          taxId: businessData.taxId,
          bankName: bankingData.bankName,
          accountName: bankingData.accountName,
          accountNumber: bankingData.accountNumber,
          bvn: bankingData.bvn,
        }),
      });
      const payload = await parseJsonResponse<VendorSettingsPayload>(response);

      if (!response.ok || !payload?.data) {
        throw new Error(
          payload?.error?.message ?? 'Could not update vendor settings right now.',
        );
      }

      hydrateForms(payload.data);
      await initialize();
      setSuccessMessage('Vendor settings updated successfully.');
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not update vendor settings right now.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'business' as const, label: 'Business', icon: Building },
    { id: 'banking' as const, label: 'Banking', icon: CreditCard },
    { id: 'more' as const, label: 'More', icon: SettingsIcon },
  ];

  if (isChecking || isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Loading vendor settings...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage the vendor details that power onboarding, payouts, and launch readiness.
        </p>
      </div>

      {error ? (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      {successMessage ? (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4">
            <p className="text-sm text-emerald-800">{successMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Settings Areas</CardTitle>
            <CardDescription>Choose what you want to update.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon className="mr-2 h-4 w-4" />
                {tab.label}
              </Button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-3">
          {activeTab === 'profile' ? (
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Keep the primary vendor contact up to date.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Full name</label>
                    <Input
                      value={profileData.name}
                      onChange={(event) =>
                        setProfileData((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Email address</label>
                    <Input value={profileData.email} disabled />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Email is currently read-only because it is tied to the active session.
                    </p>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Phone number</label>
                    <Input
                      value={profileData.phone}
                      onChange={(event) =>
                        setProfileData((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Vendor role</label>
                    <Input value={profileData.title} disabled />
                  </div>
                </div>

                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {activeTab === 'business' ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Business Information</CardTitle>
                  <CardDescription>
                    Update the core business identity used during onboarding and review.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium">Business name</label>
                      <Input
                        value={businessData.businessName}
                        onChange={(event) =>
                          setBusinessData((current) => ({
                            ...current,
                            businessName: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Legal name</label>
                      <Input
                        value={businessData.legalName}
                        onChange={(event) =>
                          setBusinessData((current) => ({
                            ...current,
                            legalName: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Business type</label>
                      <Select
                        value={businessData.businessType}
                        onValueChange={(value) =>
                          setBusinessData((current) => ({
                            ...current,
                            businessType: value,
                          }))
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
                      <label className="mb-2 block text-sm font-medium">Current hub</label>
                      <Input
                        value={
                          businessData.currentHub
                            ? `${businessData.currentHub.name}${
                                businessData.currentHub.area
                                  ? `, ${businessData.currentHub.area}`
                                  : ''
                              }`
                            : 'No hub assigned yet'
                        }
                        disabled
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Hub assignment is managed by marketplace operations.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Business address
                    </label>
                    <textarea
                      className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={businessData.businessAddress}
                      onChange={(event) =>
                        setBusinessData((current) => ({
                          ...current,
                          businessAddress: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Business license
                      </label>
                      <Input
                        value={businessData.businessLicense}
                        onChange={(event) =>
                          setBusinessData((current) => ({
                            ...current,
                            businessLicense: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Tax ID</label>
                      <Input
                        value={businessData.taxId}
                        onChange={(event) =>
                          setBusinessData((current) => ({
                            ...current,
                            taxId: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <Button onClick={handleSave} disabled={isSaving}>
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save Business Info'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Verification Status</CardTitle>
                  <CardDescription>
                    Current readiness signals for marketplace operations.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>Email verification</span>
                    </div>
                    <Badge variant={getStatusBadge(snapshot?.verification.emailVerified ?? false)}>
                      {snapshot?.verification.emailVerified ? 'Verified' : 'Pending'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>Phone verification</span>
                    </div>
                    <Badge variant={getStatusBadge(snapshot?.verification.phoneVerified ?? false)}>
                      {snapshot?.verification.phoneVerified ? 'Verified' : 'Pending'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span>Business verification</span>
                    </div>
                    <Badge
                      variant={getStatusBadge(snapshot?.verification.businessVerified ?? false)}
                    >
                      {snapshot?.verification.businessVerified ? 'Verified' : 'Under review'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>Hub assignment</span>
                    </div>
                    <Badge variant={getStatusBadge(snapshot?.verification.hubAssigned ?? false)}>
                      {snapshot?.verification.hubAssigned ? 'Assigned' : 'Pending'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}

          {activeTab === 'banking' ? (
            <Card>
              <CardHeader>
                <CardTitle>Banking Information</CardTitle>
                <CardDescription>
                  Maintain the payout details used for vendor settlements.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Bank name</label>
                    <Select
                      value={bankingData.bankName}
                      onValueChange={(value) =>
                        setBankingData((current) => ({
                          ...current,
                          bankName: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a bank" />
                      </SelectTrigger>
                      <SelectContent>
                        {BANK_OPTIONS.map((bank) => (
                          <SelectItem key={bank} value={bank}>
                            {bank}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Account name</label>
                    <Input
                      value={bankingData.accountName}
                      onChange={(event) =>
                        setBankingData((current) => ({
                          ...current,
                          accountName: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Account number</label>
                    <Input
                      value={bankingData.accountNumber}
                      onChange={(event) =>
                        setBankingData((current) => ({
                          ...current,
                          accountNumber: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">BVN</label>
                    <Input
                      value={bankingData.bvn}
                      onChange={(event) =>
                        setBankingData((current) => ({
                          ...current,
                          bvn: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="rounded-lg bg-blue-50 p-4">
                  <p className="text-sm text-blue-800">
                    Settlement currency: <strong>{bankingData.currencyCode}</strong>. Payout
                    details are stored server-side and reused by onboarding readiness checks.
                  </p>
                </div>

                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Banking Info'}
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {activeTab === 'more' ? (
            <Card>
              <CardHeader>
                <CardTitle>Next Settings Areas</CardTitle>
                <CardDescription>
                  These sections are intentionally not wired yet in this slice.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3 rounded-lg border border-border p-4">
                  <Bell className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Vendor notification preferences still need a dedicated persistence model.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-border p-4">
                  <Shield className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Security</p>
                    <p className="text-sm text-muted-foreground">
                      Password changes and stronger account security flows are still separate follow-up work.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-border p-4">
                  <Globe className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Preferences</p>
                    <p className="text-sm text-muted-foreground">
                      Language, currency, and reporting preferences have not been persisted yet.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default VendorSettingsPage;
