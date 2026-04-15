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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { parseJsonResponse } from '../../../lib/http/parse-json-response';
import type { VendorApplicationSummary } from '../../../types';

type VendorApplicationsPayload = {
  data?: VendorApplicationSummary[] | null;
  error?: {
    message?: string;
  } | null;
};

type VendorApplicationReviewPayload = {
  data?: VendorApplicationSummary | null;
  error?: {
    message?: string;
  } | null;
};

function formatStatusLabel(status: VendorApplicationSummary['applicationStatus']) {
  return status.replace('-', ' ');
}

const AdminVendorApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<VendorApplicationSummary[]>([]);
  const [selectedApplication, setSelectedApplication] =
    useState<VendorApplicationSummary | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadApplications() {
      try {
        const response = await fetch('/api/admin/vendor-applications', {
          cache: 'no-store',
        });
        const payload = await parseJsonResponse<VendorApplicationsPayload>(response);

        if (!response.ok) {
          throw new Error(
            payload?.error?.message ??
              'Could not load vendor applications right now.',
          );
        }

        if (isMounted) {
          setApplications(payload?.data ?? []);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Could not load vendor applications right now.',
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadApplications();

    return () => {
      isMounted = false;
    };
  }, []);

  const pendingCount = useMemo(
    () =>
      applications.filter((application) =>
        ['submitted', 'under-review'].includes(application.applicationStatus),
      ).length,
    [applications],
  );

  async function handleReview(action: 'approve' | 'reject') {
    if (!selectedApplication) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(
        `/api/admin/vendor-applications/${selectedApplication.id}/review`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action,
            rejectionReason: action === 'reject' ? rejectionReason : undefined,
          }),
        },
      );
      const payload = await parseJsonResponse<VendorApplicationReviewPayload>(response);

      if (!response.ok || !payload?.data) {
        throw new Error(
          payload?.error?.message ?? 'Could not complete the application review.',
        );
      }

      setApplications((current) =>
        current.map((application) =>
          application.id === payload.data!.id ? payload.data! : application,
        ),
      );
      setSelectedApplication(payload.data);
      if (action === 'approve') {
        setRejectionReason('');
      }
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : 'Could not complete the application review.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Vendor approval queue</CardTitle>
          <CardDescription>
            {pendingCount} application{pendingCount === 1 ? '' : 's'} waiting for review
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
          <CardDescription>
            Review new vendor submissions and activate approved vendors.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <p className="text-muted-foreground">Loading applications...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="p-6">
              <p className="text-muted-foreground">No vendor applications yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Business
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Applicant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Hub
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {applications.map((application) => (
                    <tr key={application.id}>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-foreground">
                            {application.businessName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {application.applicationData.businessType ?? 'Business type pending'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-foreground">
                            {application.contactName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {application.contactEmail}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {application.preferredHubName ?? 'Not selected'}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="capitalize">
                          {formatStatusLabel(application.applicationStatus)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedApplication(application);
                            setRejectionReason(application.rejectionReason ?? '');
                            setError('');
                          }}
                        >
                          Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selectedApplication)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedApplication(null);
            setRejectionReason('');
            setError('');
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          {selectedApplication ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedApplication.businessName}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">Applicant</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedApplication.contactName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Contact</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedApplication.contactEmail}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedApplication.contactPhone}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Preferred hub</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedApplication.preferredHubName ?? 'Not selected'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Volume</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedApplication.applicationData.estimatedVolume ?? 'Not provided'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground">Business address</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedApplication.applicationData.businessAddress ?? 'Not provided'}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground">Categories</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedApplication.applicationData.productCategories?.map((category) => (
                      <Badge key={category} variant="secondary" className="capitalize">
                        {category}
                      </Badge>
                    )) ?? (
                      <p className="text-sm text-muted-foreground">No categories provided.</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Rejection reason
                  </label>
                  <textarea
                    className="mt-2 min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={rejectionReason}
                    onChange={(event) => setRejectionReason(event.target.value)}
                    placeholder="Explain what needs to change before approval."
                  />
                </div>

                {error ? <p className="text-sm text-destructive">{error}</p> : null}

                <div className="flex flex-wrap justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleReview('reject')}
                    disabled={isSubmitting}
                  >
                    Reject
                  </Button>
                  <Button onClick={() => handleReview('approve')} disabled={isSubmitting}>
                    Approve Vendor
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminVendorApplicationsPage;
