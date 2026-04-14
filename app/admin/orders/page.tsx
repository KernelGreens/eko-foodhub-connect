'use client'

import React, { useEffect, useState } from 'react';
import {
  CheckCircle,
  Clock,
  Eye,
  MoreHorizontal,
  Package,
  Truck,
  XCircle,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { getAllowedNextOrderStatuses } from '../../../lib/orders/order-view-model';
import { useProductStore } from '../../../stores/productStore';
import type { Order, OrderStatus } from '../../../types';
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

const statusActionLabels: Record<OrderStatus, string> = {
  pending: 'Confirm Order',
  confirmed: 'Start Preparing',
  preparing: 'Mark as Ready',
  ready: 'Mark In Transit',
  'in-transit': 'Mark Delivered',
  delivered: 'Delivered',
  cancelled: 'Cancel Order',
};

const AdminOrdersPage: React.FC = () => {
  const { products, fetchProducts } = useProductStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (products.length === 0) {
      fetchProducts();
    }
  }, [fetchProducts, products.length]);

  useEffect(() => {
    let isMounted = true;

    async function loadOrders() {
      setIsLoading(true);

      try {
        const response = await fetch('/api/operator/orders?actorRole=admin');
        const payload = await response.json();
        const nextOrders = Array.isArray(payload?.data)
          ? payload.data.map((order: Order) => hydrateOrder(order))
          : [];

        if (isMounted) {
          setOrders(nextOrders);
        }
      } catch (error) {
        console.error('Failed to load admin orders.', error);
        if (isMounted) {
          setOrders([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      isMounted = false;
    };
  }, []);

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      case 'preparing':
        return 'bg-orange-100 text-orange-800 hover:bg-orange-100';
      case 'ready':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-100';
      case 'in-transit':
        return 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100';
      case 'delivered':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'cancelled':
        return 'bg-red-100 text-red-800 hover:bg-red-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return Clock;
      case 'confirmed':
        return CheckCircle;
      case 'preparing':
      case 'ready':
        return Package;
      case 'in-transit':
        return Truck;
      case 'delivered':
        return CheckCircle;
      case 'cancelled':
        return XCircle;
      default:
        return Clock;
    }
  };

  const getProductName = (productId: string) => {
    return products.find((product) => product.id === productId)?.name ?? 'Product';
  };

  const handleStatusUpdate = async (orderId: string, nextStatus: OrderStatus) => {
    setUpdatingOrderId(orderId);

    try {
      const response = await fetch(`/api/operator/orders/${orderId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actorRole: 'admin',
          nextStatus,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error?.message ?? 'Failed to update order status.');
      }

      const updatedOrder = hydrateOrder(payload.data as Order);

      setOrders((currentOrders) =>
        currentOrders.map((order) => (order.id === orderId ? updatedOrder : order)),
      );
      setSelectedOrder((currentOrder) =>
        currentOrder?.id === orderId ? updatedOrder : currentOrder,
      );
    } catch (error) {
      console.error('Failed to update admin order status.', error);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Loading orders...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Marketplace Orders</CardTitle>
          <CardDescription>
            {orders.length} orders currently visible to marketplace operations
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground">No orders yet</h3>
              <p className="text-muted-foreground">
                Orders will appear here after buyers complete checkout.
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
                      Buyer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Total
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
                  {orders.map((order) => {
                    const StatusIcon = getStatusIcon(order.status);

                    return (
                      <tr key={order.id} className="hover:bg-muted/30">
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">{order.id}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(order.createdAt)}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">
                              Buyer #{order.buyerId}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {order.deliveryAddress.area}, {order.deliveryAddress.lga}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">
                          {order.items.length} item{order.items.length > 1 ? 's' : ''}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-foreground">
                          {formatCurrency(order.totalAmount)}
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={getStatusColor(order.status)}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {order.status.replace('-', ' ')}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedOrder(order)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={updatingOrderId === order.id}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {getAllowedNextOrderStatuses(order.status).map((nextStatus) => (
                                  <DropdownMenuItem
                                    key={nextStatus}
                                    onClick={() => handleStatusUpdate(order.id, nextStatus)}
                                  >
                                    {statusActionLabels[nextStatus]}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedOrder)} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Operational detail for {selectedOrder?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder ? (
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Buyer</span>
                    <span className="font-medium">#{selectedOrder.buyerId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Payment</span>
                    <span className="capitalize">
                      {selectedOrder.paymentMethod.replace('-', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge className={getStatusColor(selectedOrder.status)}>
                      {selectedOrder.status.replace('-', ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-semibold">
                      {formatCurrency(selectedOrder.totalAmount)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Items</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedOrder.items.map((item, index) => (
                    <div
                      key={`${selectedOrder.id}-${item.productId}-${index}`}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {getProductName(item.productId)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Qty {item.quantity}
                        </p>
                      </div>
                      <p className="font-medium text-foreground">
                        {formatCurrency(item.totalPrice)}
                      </p>
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

export default AdminOrdersPage;
