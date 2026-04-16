'use client'

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Eye, PackageCheck } from 'lucide-react';

import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import type { DispatchBatch } from '../../../types';
import { formatCurrency, formatDate } from '../../../utils/format';

function hydrateBatch(batch: DispatchBatch): DispatchBatch {
  return {
    ...batch,
    createdAt: new Date(batch.createdAt),
    updatedAt: new Date(batch.updatedAt),
    assignedAt: batch.assignedAt ? new Date(batch.assignedAt) : undefined,
    pickedUpAt: batch.pickedUpAt ? new Date(batch.pickedUpAt) : undefined,
    deliveredAt: batch.deliveredAt ? new Date(batch.deliveredAt) : undefined,
    proofOfDelivery: batch.proofOfDelivery
      ? {
          ...batch.proofOfDelivery,
          createdAt: new Date(batch.proofOfDelivery.createdAt),
        }
      : undefined,
  };
}

function getStatusClasses(status: DispatchBatch['status']) {
  switch (status) {
    case 'assigned':
      return 'bg-purple-100 text-purple-800 hover:bg-purple-100';
    case 'picked-up':
    case 'out-for-delivery':
      return 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100';
    case 'delivered':
      return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100';
    case 'failed':
    case 'cancelled':
      return 'bg-red-100 text-red-800 hover:bg-red-100';
    case 'pending-assignment':
    default:
      return 'bg-slate-100 text-slate-800 hover:bg-slate-100';
  }
}

function formatLabel(value: string) {
  return value.replace(/-/g, ' ');
}

const LogisticsDispatchBatchesPage: React.FC = () => {
  const [batches, setBatches] = useState<DispatchBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<DispatchBatch | null>(null);
  const [failureReason, setFailureReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadBatches() {
      setIsLoading(true);

      try {
        const response = await fetch('/api/logistics/dispatch-batches', {
          cache: 'no-store',
        });
        const payload = await response.json();
        const nextBatches = Array.isArray(payload?.data)
          ? payload.data.map((batch: DispatchBatch) => hydrateBatch(batch))
          : [];

        if (isMounted) {
          setBatches(nextBatches);
        }
      } catch (error) {
        console.error('Failed to load logistics dispatch batches.', error);
        if (isMounted) {
          setBatches([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadBatches();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedBatch) {
      setFailureReason('');
      setFeedbackMessage(null);
      setFeedbackError(null);
      return;
    }

    setFailureReason('');
    setFeedbackMessage(null);
    setFeedbackError(null);
  }, [selectedBatch]);

  const stats = {
    total: batches.length,
    active: batches.filter((batch) =>
      ['assigned', 'picked-up', 'out-for-delivery'].includes(batch.status),
    ).length,
    failed: batches.filter((batch) => batch.status === 'failed').length,
    delivered: batches.filter((batch) => batch.status === 'delivered').length,
  };

  async function handleFailBatch() {
    if (!selectedBatch) {
      return;
    }

    setIsSaving(true);
    setFeedbackMessage(null);
    setFeedbackError(null);

    try {
      const response = await fetch(
        `/api/logistics/dispatch-batches/${selectedBatch.id}/fail`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reason: failureReason,
          }),
        },
      );
      const payload = await response.json();

      if (!response.ok || !payload?.data) {
        throw new Error(
          payload?.error?.message ?? 'Failed to report dispatch exception.',
        );
      }

      const updatedBatch = hydrateBatch(payload.data as DispatchBatch);

      setBatches((current) =>
        current.map((batch) => (batch.id === updatedBatch.id ? updatedBatch : batch)),
      );
      setSelectedBatch(updatedBatch);
      setFailureReason('');
      setFeedbackMessage('Dispatch exception reported to operations successfully.');
    } catch (error) {
      console.error('Failed to report dispatch exception.', error);
      setFeedbackError(
        error instanceof Error
          ? error.message
          : 'Failed to report dispatch exception.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Loading dispatch batches...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Assigned batches</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">{stats.active}</div>
            <div className="text-sm text-muted-foreground">Active runs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-sm text-muted-foreground">Reported issues</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{stats.delivered}</div>
            <div className="text-sm text-muted-foreground">Delivered</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Dispatch Runs</CardTitle>
          <CardDescription>
            Review the grouped hub batches you are responsible for delivering.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {batches.length === 0 ? (
            <div className="py-12 text-center">
              <PackageCheck className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground">No dispatch batches assigned</h3>
              <p className="text-muted-foreground">
                Operations dispatch runs assigned to you will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Batch
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Destination
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Scope
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background">
                  {batches.map((batch) => (
                    <tr key={batch.batchCode} className="hover:bg-muted/30">
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">{batch.batchCode}</p>
                          <p className="text-sm text-muted-foreground">Order {batch.orderId}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            {batch.destination.area}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {batch.destination.lga}, {batch.destination.state}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1 text-sm">
                          <p className="font-medium text-foreground">
                            {batch.itemCount} items across {batch.vendorCount} vendor
                            {batch.vendorCount === 1 ? '' : 's'}
                          </p>
                          <p className="text-muted-foreground">
                            {batch.fulfillmentGroupCount} fulfillment group
                            {batch.fulfillmentGroupCount === 1 ? '' : 's'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={getStatusClasses(batch.status)}>
                          {formatLabel(batch.status)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedBatch(batch)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
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
        open={Boolean(selectedBatch)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedBatch(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dispatch Batch Details</DialogTitle>
            <DialogDescription>
              Review the grouped delivery run and any proof already captured.
            </DialogDescription>
          </DialogHeader>
          {selectedBatch ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Run Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Batch code</span>
                      <span className="font-medium text-foreground">
                        {selectedBatch.batchCode}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Status</span>
                      <Badge className={getStatusClasses(selectedBatch.status)}>
                        {formatLabel(selectedBatch.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Total value</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(selectedBatch.totalAmount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Assigned operator</span>
                      <span className="font-medium text-foreground">
                        {selectedBatch.operatorName ?? 'Unassigned'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Assigned at</span>
                      <span className="font-medium text-foreground">
                        {selectedBatch.assignedAt
                          ? formatDate(selectedBatch.assignedAt)
                          : 'Not recorded'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Destination</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Area</span>
                      <span className="font-medium text-foreground">
                        {selectedBatch.destination.area}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">LGA</span>
                      <span className="font-medium text-foreground">
                        {selectedBatch.destination.lga}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">State</span>
                      <span className="font-medium text-foreground">
                        {selectedBatch.destination.state}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Last updated</span>
                      <span className="font-medium text-foreground">
                        {formatDate(selectedBatch.updatedAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Picked up</span>
                      <span className="font-medium text-foreground">
                        {selectedBatch.pickedUpAt
                          ? formatDate(selectedBatch.pickedUpAt)
                          : 'Not yet'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Delivered</span>
                      <span className="font-medium text-foreground">
                        {selectedBatch.deliveredAt
                          ? formatDate(selectedBatch.deliveredAt)
                          : 'Not yet'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Dispatch Notes</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {selectedBatch.notes ? (
                    <p className="whitespace-pre-wrap text-foreground">
                      {selectedBatch.notes}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">
                      No dispatch notes have been attached to this run yet.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Report Delivery Exception</CardTitle>
                  <CardDescription>
                    Tell operations why this run failed so it can be reassigned or recovered.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <textarea
                    value={failureReason}
                    onChange={(event) => setFailureReason(event.target.value)}
                    rows={3}
                    disabled={
                      isSaving ||
                      ['delivered', 'cancelled'].includes(selectedBatch.status)
                    }
                    placeholder="Explain the issue: buyer unavailable, route problem, damaged package, or similar."
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  />

                  {feedbackMessage ? (
                    <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      {feedbackMessage}
                    </div>
                  ) : null}

                  {feedbackError ? (
                    <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                      {feedbackError}
                    </div>
                  ) : null}

                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      onClick={handleFailBatch}
                      disabled={
                        isSaving ||
                        ['delivered', 'cancelled'].includes(selectedBatch.status)
                      }
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      {selectedBatch.status === 'failed'
                        ? 'Update Failure Report'
                        : 'Report Failure'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Included Vendors</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {selectedBatch.vendorNames.map((vendorName) => (
                    <div
                      key={vendorName}
                      className="rounded-lg border border-border/60 px-3 py-2 text-foreground"
                    >
                      {vendorName}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Proof of Delivery</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {selectedBatch.proofOfDelivery ? (
                    <>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">Proof type</span>
                        <span className="font-medium capitalize text-foreground">
                          {formatLabel(selectedBatch.proofOfDelivery.proofType)}
                        </span>
                      </div>
                      {selectedBatch.proofOfDelivery.proofValue ? (
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">Proof value</span>
                          <span className="font-medium text-foreground">
                            {selectedBatch.proofOfDelivery.proofValue}
                          </span>
                        </div>
                      ) : null}
                      {selectedBatch.proofOfDelivery.proofUrl ? (
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">Proof URL</span>
                          <a
                            className="font-medium text-emerald-700 underline"
                            href={selectedBatch.proofOfDelivery.proofUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View proof
                          </a>
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">Captured at</span>
                        <span className="font-medium text-foreground">
                          {formatDate(selectedBatch.proofOfDelivery.createdAt)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground">
                      Proof will appear here after delivery completion.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LogisticsDispatchBatchesPage;
