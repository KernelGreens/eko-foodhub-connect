'use client'

import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock, Eye, MapPin, Package, Truck } from 'lucide-react';

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
import { Input } from '../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { uploadEvidenceFile } from '../../../lib/storage/upload-evidence-client';
import type { Order } from '../../../types';
import { formatCurrency, formatDate } from '../../../utils/format';

function hydrateOrder(order: Order): Order {
  return {
    ...order,
    createdAt: new Date(order.createdAt),
    updatedAt: new Date(order.updatedAt),
    cancelledAt: order.cancelledAt ? new Date(order.cancelledAt) : undefined,
    deliveryDate: order.deliveryDate ? new Date(order.deliveryDate) : undefined,
    statusHistory: order.statusHistory?.map((event) => ({
      ...event,
      createdAt: new Date(event.createdAt),
    })),
  };
}

const LogisticsDeliveriesPage: React.FC = () => {
  const [deliveries, setDeliveries] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<Order | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [proofOrder, setProofOrder] = useState<Order | null>(null);
  const [proofType, setProofType] = useState<'PHOTO' | 'SIGNATURE' | 'OTP' | 'MANUAL_CONFIRMATION'>('MANUAL_CONFIRMATION');
  const [proofValue, setProofValue] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isUploadingProofFile, setIsUploadingProofFile] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadDeliveries() {
      setIsLoading(true);

      try {
        const response = await fetch('/api/logistics/deliveries');
        const payload = await response.json();
        const nextDeliveries = Array.isArray(payload?.data)
          ? payload.data.map((order: Order) => hydrateOrder(order))
          : [];

        if (isMounted) {
          setDeliveries(nextDeliveries);
        }
      } catch (error) {
        console.error('Failed to load logistics deliveries.', error);
        if (isMounted) {
          setDeliveries([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDeliveries();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleStatusUpdate(orderId: string, nextStatus: 'in-transit' | 'delivered') {
    setUpdatingOrderId(orderId);

    try {
      const response = await fetch(`/api/logistics/deliveries/${orderId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nextStatus,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error?.message ?? 'Failed to update delivery.');
      }

      const updatedOrder = hydrateOrder(payload.data as Order);

      setDeliveries((current) =>
        current.map((order) => (order.id === orderId ? updatedOrder : order)),
      );
      setSelectedDelivery((current) =>
        current?.id === orderId ? updatedOrder : current,
      );
    } catch (error) {
      console.error('Failed to update logistics delivery status.', error);
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function handleProofAndDelivery() {
    if (!proofOrder) {
      return;
    }

    setUpdatingOrderId(proofOrder.id);

    try {
      const proofResponse = await fetch(
        `/api/logistics/deliveries/${proofOrder.id}/proof-of-delivery`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            proofType,
            proofValue,
            proofUrl,
          }),
        },
      );
      const proofPayload = await proofResponse.json();

      if (!proofResponse.ok || !proofPayload?.data) {
        throw new Error(proofPayload?.error?.message ?? 'Failed to capture proof of delivery.');
      }

      const deliveryResponse = await fetch(
        `/api/logistics/deliveries/${proofOrder.id}/status`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nextStatus: 'delivered',
          }),
        },
      );
      const deliveryPayload = await deliveryResponse.json();

      if (!deliveryResponse.ok || !deliveryPayload?.data) {
        throw new Error(deliveryPayload?.error?.message ?? 'Failed to mark delivery as complete.');
      }

      const updatedOrder = hydrateOrder(deliveryPayload.data as Order);

      setDeliveries((current) =>
        current.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)),
      );
      setSelectedDelivery((current) =>
        current?.id === updatedOrder.id ? updatedOrder : current,
      );
      setProofOrder(null);
      setProofType('MANUAL_CONFIRMATION');
      setProofValue('');
      setProofUrl('');
      setProofFile(null);
    } catch (error) {
      console.error('Failed to complete proof of delivery workflow.', error);
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function handleProofFileUpload() {
    if (!proofFile) {
      return;
    }

    setIsUploadingProofFile(true);

    try {
      const uploadedFile = await uploadEvidenceFile(proofFile, 'delivery');
      setProofUrl(uploadedFile.url);
      setProofFile(null);
    } catch (error) {
      console.error('Failed to upload proof of delivery file.', error);
    } finally {
      setIsUploadingProofFile(false);
    }
  }

  const deliveryStats = {
    total: deliveries.length,
    assigned: deliveries.filter((order) => order.status === 'ready').length,
    inTransit: deliveries.filter((order) => order.status === 'in-transit').length,
    delivered: deliveries.filter((order) => order.status === 'delivered').length,
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Loading assigned deliveries...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{deliveryStats.total}</div>
            <div className="text-sm text-muted-foreground">Assigned</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{deliveryStats.assigned}</div>
            <div className="text-sm text-muted-foreground">Ready for pickup</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">{deliveryStats.inTransit}</div>
            <div className="text-sm text-muted-foreground">In transit</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{deliveryStats.delivered}</div>
            <div className="text-sm text-muted-foreground">Delivered</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Deliveries</CardTitle>
          <CardDescription>
            Orders assigned by operations for last-mile delivery.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {deliveries.length === 0 ? (
            <div className="py-12 text-center">
              <Truck className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground">No deliveries assigned</h3>
              <p className="text-muted-foreground">
                New dispatch assignments will appear here after operations allocates them.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Destination
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Fulfillment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Batch
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
                  {deliveries.map((delivery) => (
                    <tr key={delivery.id} className="hover:bg-muted/30">
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">{delivery.id}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(delivery.createdAt)}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            {delivery.deliveryAddress.area}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {delivery.deliveryAddress.lga}, {delivery.deliveryAddress.state}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {delivery.logisticsAssignment?.assignedFulfillmentGroups ?? 0} hub batch
                        {delivery.logisticsAssignment?.assignedFulfillmentGroups === 1 ? '' : 'es'}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {delivery.logisticsAssignment?.dispatchBatchCode ?? 'Pending batch'}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          className={
                            delivery.status === 'ready'
                              ? 'bg-purple-100 text-purple-800 hover:bg-purple-100'
                              : delivery.status === 'in-transit'
                                ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100'
                                : 'bg-green-100 text-green-800 hover:bg-green-100'
                          }
                        >
                          {delivery.status.replace('-', ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedDelivery(delivery)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {delivery.status === 'ready' ? (
                            <Button
                              size="sm"
                              onClick={() => handleStatusUpdate(delivery.id, 'in-transit')}
                              disabled={updatingOrderId === delivery.id}
                            >
                              Start Delivery
                            </Button>
                          ) : null}
                          {delivery.status === 'in-transit' ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                setProofOrder(delivery);
                                setProofType('MANUAL_CONFIRMATION');
                                setProofValue('');
                                setProofUrl('');
                              }}
                              disabled={updatingOrderId === delivery.id}
                            >
                              Capture Proof
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

      <Dialog open={Boolean(selectedDelivery)} onOpenChange={() => setSelectedDelivery(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Delivery Details</DialogTitle>
            <DialogDescription>
              Dispatch detail for {selectedDelivery?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedDelivery ? (
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Delivery status</span>
                    <Badge variant="outline">{selectedDelivery.status.replace('-', ' ')}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Assigned batches</span>
                    <span className="font-medium">
                      {selectedDelivery.logisticsAssignment?.assignedFulfillmentGroups ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Dispatch batch</span>
                    <span className="font-medium">
                      {selectedDelivery.logisticsAssignment?.dispatchBatchCode ?? 'Pending batch'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Order total</span>
                    <span className="font-medium">
                      {formatCurrency(selectedDelivery.totalAmount)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {selectedDelivery.logisticsAssignment?.proofOfDelivery ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Proof of Delivery</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Proof type</span>
                      <span className="capitalize">
                        {selectedDelivery.logisticsAssignment.proofOfDelivery.proofType.replace(
                          /-/g,
                          ' ',
                        )}
                      </span>
                    </div>
                    {selectedDelivery.logisticsAssignment.proofOfDelivery.proofValue ? (
                      <div>
                        <p className="text-sm font-medium text-foreground">Proof value</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedDelivery.logisticsAssignment.proofOfDelivery.proofValue}
                        </p>
                      </div>
                    ) : null}
                    {selectedDelivery.logisticsAssignment.proofOfDelivery.proofUrl ? (
                      <a
                        href={selectedDelivery.logisticsAssignment.proofOfDelivery.proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-primary hover:text-primary/80"
                      >
                        Open uploaded proof
                      </a>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="h-5 w-5" />
                    Delivery Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p>{selectedDelivery.deliveryAddress.street}</p>
                  <p>{selectedDelivery.deliveryAddress.area}</p>
                  <p>
                    {selectedDelivery.deliveryAddress.lga}, {selectedDelivery.deliveryAddress.state}
                  </p>
                  {selectedDelivery.deliveryAddress.landmark ? (
                    <p className="text-muted-foreground">
                      Landmark: {selectedDelivery.deliveryAddress.landmark}
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedDelivery.statusHistory?.map((event) => (
                    <div key={event.id} className="flex items-start gap-3">
                      {event.status === 'delivered' ? (
                        <CheckCircle className="mt-0.5 h-4 w-4 text-emerald-600" />
                      ) : event.status === 'in-transit' ? (
                        <Truck className="mt-0.5 h-4 w-4 text-indigo-600" />
                      ) : event.status === 'ready' ? (
                        <Package className="mt-0.5 h-4 w-4 text-purple-600" />
                      ) : (
                        <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">{event.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(event.createdAt)}
                        </p>
                        {event.note ? (
                          <p className="text-sm text-muted-foreground">{event.note}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(proofOrder)}
        onOpenChange={() => {
          setProofOrder(null);
          setProofType('MANUAL_CONFIRMATION');
          setProofValue('');
          setProofUrl('');
          setProofFile(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Capture Proof of Delivery</DialogTitle>
            <DialogDescription>
              Record delivery evidence before completing {proofOrder?.id}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Proof type
              </label>
              <Select
                value={proofType}
                onValueChange={(value) =>
                  setProofType(
                    value as 'PHOTO' | 'SIGNATURE' | 'OTP' | 'MANUAL_CONFIRMATION',
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select proof type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL_CONFIRMATION">Manual Confirmation</SelectItem>
                  <SelectItem value="OTP">OTP</SelectItem>
                  <SelectItem value="SIGNATURE">Signature</SelectItem>
                  <SelectItem value="PHOTO">Photo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Proof value
              </label>
              <Input
                value={proofValue}
                onChange={(event) => setProofValue(event.target.value)}
                placeholder="OTP code, receiver name, signature reference, or delivery note"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Proof URL
              </label>
              <Input
                value={proofUrl}
                onChange={(event) => setProofUrl(event.target.value)}
                placeholder="https://example.com/proof-image.jpg"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Upload proof file
              </label>
              <input
                type="file"
                accept="image/*,video/*,application/pdf,text/plain"
                onChange={(event) => setProofFile(event.target.files?.[0] ?? null)}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleProofFileUpload()}
                disabled={isUploadingProofFile}
              >
                {isUploadingProofFile ? 'Uploading Proof...' : 'Upload Proof File'}
              </Button>
            </div>

            <Button
              className="w-full"
              onClick={handleProofAndDelivery}
              disabled={updatingOrderId === proofOrder?.id}
            >
              Save Proof and Complete Delivery
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LogisticsDeliveriesPage;
