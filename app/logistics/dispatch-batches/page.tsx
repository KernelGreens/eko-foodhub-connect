'use client'

import React, { useEffect, useState } from 'react';
import { Eye, PackageCheck } from 'lucide-react';

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

const LogisticsDispatchBatchesPage: React.FC = () => {
  const [batches, setBatches] = useState<DispatchBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<DispatchBatch | null>(null);

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

  const stats = {
    total: batches.length,
    active: batches.filter((batch) =>
      ['assigned', 'picked-up', 'out-for-delivery'].includes(batch.status),
    ).length,
    delivered: batches.filter((batch) => batch.status === 'delivered').length,
  };

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
      <div className="grid gap-4 md:grid-cols-3">
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
                          {batch.status.replaceAll('-', ' ')}
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
                        {selectedBatch.status.replaceAll('-', ' ')}
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
                  </CardContent>
                </Card>
              </div>

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
                          {selectedBatch.proofOfDelivery.proofType.replaceAll('-', ' ')}
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
