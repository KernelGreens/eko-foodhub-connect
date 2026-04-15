'use client'

import React, { useEffect, useState } from 'react';
import { Eye, PackageCheck, Truck } from 'lucide-react';

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
    case 'pending-assignment':
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
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
    default:
      return 'bg-slate-100 text-slate-800 hover:bg-slate-100';
  }
}

const AdminDispatchBatchesPage: React.FC = () => {
  const [batches, setBatches] = useState<DispatchBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<DispatchBatch | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadBatches() {
      setIsLoading(true);

      try {
        const response = await fetch('/api/admin/dispatch-batches', {
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
        console.error('Failed to load dispatch batches.', error);
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
    assigned: batches.filter((batch) => batch.status === 'assigned').length,
    active: batches.filter((batch) =>
      ['picked-up', 'out-for-delivery'].includes(batch.status),
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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Dispatch batches</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.assigned}</div>
            <div className="text-sm text-muted-foreground">Assigned</div>
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
          <CardTitle>Hub Dispatch Runs</CardTitle>
          <CardDescription>
            Track grouped vendor fulfillment moving through hub dispatch and delivery.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {batches.length === 0 ? (
            <div className="py-12 text-center">
              <PackageCheck className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground">No dispatch batches yet</h3>
              <p className="text-muted-foreground">
                Batches will appear here once operations assigns ready orders to logistics.
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
                      Vendors
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Operator
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
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            {batch.vendorCount} vendor{batch.vendorCount === 1 ? '' : 's'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {batch.fulfillmentGroupCount} fulfillment group
                            {batch.fulfillmentGroupCount === 1 ? '' : 's'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {batch.operatorName ?? 'Awaiting assignment'}
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
              Review the grouped hub run, assigned operator, and delivery evidence.
            </DialogDescription>
          </DialogHeader>
          {selectedBatch ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Batch Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Batch code</span>
                      <span className="font-medium text-foreground">
                        {selectedBatch.batchCode}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Order</span>
                      <span className="font-medium text-foreground">{selectedBatch.orderId}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Status</span>
                      <Badge className={getStatusClasses(selectedBatch.status)}>
                        {selectedBatch.status.replaceAll('-', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Created</span>
                      <span className="font-medium text-foreground">
                        {formatDate(selectedBatch.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Updated</span>
                      <span className="font-medium text-foreground">
                        {formatDate(selectedBatch.updatedAt)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Route Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Destination</span>
                      <span className="font-medium text-right text-foreground">
                        {selectedBatch.destination.area}, {selectedBatch.destination.lga}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Operator</span>
                      <span className="font-medium text-foreground">
                        {selectedBatch.operatorName ?? 'Awaiting assignment'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Items</span>
                      <span className="font-medium text-foreground">
                        {selectedBatch.itemCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Total value</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(selectedBatch.totalAmount)}
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
                      className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2"
                    >
                      <Truck className="h-4 w-4 text-emerald-600" />
                      <span className="text-foreground">{vendorName}</span>
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
                      No proof of delivery has been attached to this dispatch batch yet.
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

export default AdminDispatchBatchesPage;
