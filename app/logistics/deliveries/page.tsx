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
                              onClick={() => handleStatusUpdate(delivery.id, 'delivered')}
                              disabled={updatingOrderId === delivery.id}
                            >
                              Mark Delivered
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
                    <span className="text-muted-foreground">Order total</span>
                    <span className="font-medium">
                      {formatCurrency(selectedDelivery.totalAmount)}
                    </span>
                  </div>
                </CardContent>
              </Card>

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
    </div>
  );
};

export default LogisticsDeliveriesPage;
