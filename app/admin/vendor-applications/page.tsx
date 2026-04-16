'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react';

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

function formatDateTime(value?: Date) {
  if (!value) {
    return 'Not available';
  }

  return new Date(value).toLocaleString();
}

function formatDocumentTypeLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function ReviewField({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-sm text-muted-foreground">{value || 'Not provided'}</p>
    </div>
  );
}

const AdminVendorApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<VendorApplicationSummary[]>([]);
  const [selectedApplication, setSelectedApplication] =
    useState<VendorApplicationSummary | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
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

    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');

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
      setSuccessMessage(
        action === 'approve'
          ? 'Vendor application approved successfully. Closing review...'
          : 'Vendor application rejected successfully. Closing review...',
      );
      closeTimeoutRef.current = setTimeout(() => {
        setSelectedApplication(null);
        setRejectionReason('');
        setError('');
        setSuccessMessage('');
        closeTimeoutRef.current = null;
      }, 1400);
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
                            if (closeTimeoutRef.current) {
                              clearTimeout(closeTimeoutRef.current);
                              closeTimeoutRef.current = null;
                            }
                            setSelectedApplication(application);
                            setRejectionReason(application.rejectionReason ?? '');
                            setError('');
                            setSuccessMessage('');
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
            if (closeTimeoutRef.current) {
              clearTimeout(closeTimeoutRef.current);
              closeTimeoutRef.current = null;
            }
            setSelectedApplication(null);
            setRejectionReason('');
            setError('');
            setSuccessMessage('');
          }
        }}
      >
        <DialogContent className="sm:max-w-4xl">
          {selectedApplication ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedApplication.businessName}</DialogTitle>
              </DialogHeader>

              <div className="max-h-[80vh] space-y-6 overflow-y-auto pr-2">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Application Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <ReviewField
                        label="Current status"
                        value={formatStatusLabel(selectedApplication.applicationStatus)}
                      />
                      <ReviewField
                        label="Submitted at"
                        value={formatDateTime(selectedApplication.submittedAt)}
                      />
                      <ReviewField
                        label="Reviewed at"
                        value={formatDateTime(selectedApplication.reviewedAt)}
                      />
                      <ReviewField
                        label="Reviewer"
                        value={selectedApplication.reviewer?.name}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Applicant</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <ReviewField
                        label="Full name"
                        value={selectedApplication.contactName}
                      />
                      <ReviewField
                        label="Email"
                        value={selectedApplication.contactEmail}
                      />
                      <ReviewField
                        label="Phone"
                        value={selectedApplication.contactPhone}
                      />
                      <ReviewField
                        label="Applicant user ID"
                        value={selectedApplication.applicantUserId}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Marketplace Routing</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <ReviewField
                        label="Preferred hub"
                        value={selectedApplication.preferredHubName}
                      />
                      <ReviewField
                        label="Preferred hub code"
                        value={selectedApplication.preferredHubCode}
                      />
                      <ReviewField
                        label="Estimated volume"
                        value={selectedApplication.applicationData.estimatedVolume}
                      />
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Business Information</CardTitle>
                    <CardDescription>
                      Core legal and operational details submitted by the vendor applicant.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <ReviewField
                        label="Business name"
                        value={selectedApplication.businessName}
                      />
                      <ReviewField
                        label="Business type"
                        value={selectedApplication.applicationData.businessType}
                      />
                      <ReviewField
                        label="Business license"
                        value={selectedApplication.applicationData.businessLicense}
                      />
                      <ReviewField
                        label="Tax ID"
                        value={selectedApplication.applicationData.taxId}
                      />
                    </div>
                    <ReviewField
                      label="Business address"
                      value={selectedApplication.applicationData.businessAddress}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Product Scope</CardTitle>
                    <CardDescription>
                      Product categories and operating focus for the vendor.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ReviewField
                      label="Preferred hub selection"
                      value={selectedApplication.applicationData.preferredHub}
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">Product categories</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedApplication.applicationData.productCategories?.length ? (
                          selectedApplication.applicationData.productCategories.map((category) => (
                            <Badge key={category} variant="secondary" className="capitalize">
                              {category}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No categories provided.
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Banking Information</CardTitle>
                    <CardDescription>
                      Payout and settlement details submitted for vendor operations.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <ReviewField
                      label="Bank name"
                      value={selectedApplication.applicationData.bankName}
                    />
                    <ReviewField
                      label="Account name"
                      value={selectedApplication.applicationData.accountName}
                    />
                    <ReviewField
                      label="Account number"
                      value={selectedApplication.applicationData.accountNumber}
                    />
                    <ReviewField
                      label="BVN"
                      value={selectedApplication.applicationData.bvn}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Supporting Evidence</CardTitle>
                    <CardDescription>
                      Review document links and extra context submitted by the applicant.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedApplication.documents.length ? (
                      <div className="space-y-3">
                        {selectedApplication.documents.map((document) => (
                          <div
                            key={document.id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"
                          >
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-foreground">
                                  {document.displayName}
                                </p>
                                <Badge variant="outline" className="capitalize">
                                  {formatStatusLabel(document.verificationStatus)}
                                </Badge>
                              </div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                {formatDocumentTypeLabel(document.documentType)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Uploaded {formatDateTime(document.uploadedAt)}
                              </p>
                            </div>
                            <a
                              href={document.documentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm font-medium text-primary hover:text-primary/80"
                            >
                              Open document
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No supporting evidence links were submitted with this application.
                      </p>
                    )}

                    {selectedApplication.applicationData.additionalEvidenceNotes ? (
                      <div className="rounded-lg border border-border bg-muted/30 p-4">
                        <p className="text-sm font-medium text-foreground">
                          Additional review notes
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {selectedApplication.applicationData.additionalEvidenceNotes}
                        </p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                {selectedApplication.rejectionReason ? (
                  <Card className="border-destructive/20 bg-destructive/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-destructive">
                        Existing Review Feedback
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-destructive/90">
                        {selectedApplication.rejectionReason}
                      </p>
                    </CardContent>
                  </Card>
                ) : null}

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

                {successMessage ? (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    <p>{successMessage}</p>
                    <p className="mt-1 text-xs text-emerald-700">
                      This review will close automatically in a moment.
                    </p>
                  </div>
                ) : null}

                {error ? <p className="text-sm text-destructive">{error}</p> : null}

                <div className="flex flex-wrap justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleReview('reject')}
                    disabled={isSubmitting || Boolean(successMessage)}
                  >
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleReview('approve')}
                    disabled={isSubmitting || Boolean(successMessage)}
                  >
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
