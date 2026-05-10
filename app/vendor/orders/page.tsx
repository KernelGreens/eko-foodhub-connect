'use client'

import React, { useEffect, useState } from 'react';
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Truck,
  Filter,
  Search,
  MoreHorizontal,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import Image from 'next/image';

import { useAuthStore } from '../../../stores/authStore';
import { useProductStore } from '../../../stores/productStore';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../../components/ui/dropdown-menu';
import { getAllowedNextOrderStatuses } from '../../../lib/orders/order-view-model';
import {
  getFulfillmentPaymentPolicyCopy,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
} from '../../../lib/payments/payment-display';
import { formatCurrency, formatDate } from '../../../utils/format';
import { Order, OrderStatus } from '../../../types';

type FulfillmentIssueType =
  | 'stock-shortage'
  | 'quality-issue'
  | 'prep-delay'
  | 'item-unavailable'
  | 'substitution-needed'
  | 'other';

type FulfillmentAdjustmentType =
  | 'shortage'
  | 'substitution'
  | 'unavailable'
  | 'resolved';

const fulfillmentIssueOptions: Array<{
  value: FulfillmentIssueType;
  label: string;
}> = [
  { value: 'stock-shortage', label: 'Stock shortage' },
  { value: 'quality-issue', label: 'Quality issue' },
  { value: 'prep-delay', label: 'Preparation delay' },
  { value: 'item-unavailable', label: 'Item unavailable' },
  { value: 'substitution-needed', label: 'Substitution needed' },
  { value: 'other', label: 'Other' },
];

const fulfillmentAdjustmentOptions: Array<{
  value: FulfillmentAdjustmentType;
  label: string;
}> = [
  { value: 'shortage', label: 'Record shortage' },
  { value: 'substitution', label: 'Propose substitution' },
  { value: 'unavailable', label: 'Mark unavailable' },
  { value: 'resolved', label: 'Mark resolved' },
];

const itemFulfillmentStatusLabels: Record<string, string> = {
  SHORTAGE_REPORTED: 'Shortage reported',
  SUBSTITUTION_PROPOSED: 'Substitution proposed',
  UNAVAILABLE: 'Unavailable',
  RESOLVED: 'Resolved',
};

function getItemFulfillmentStatusLabel(status?: string) {
  if (!status) {
    return null;
  }

  return itemFulfillmentStatusLabels[status] ?? status.replace(/_/g, ' ').toLowerCase();
}

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

const VendorOrders: React.FC = () => {
  const { vendor } = useAuthStore();
  const { products, fetchProducts } = useProductStore();
  const [vendorOrders, setVendorOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [issueType, setIssueType] = useState<FulfillmentIssueType>('stock-shortage');
  const [affectedProductListingId, setAffectedProductListingId] = useState('none');
  const [issueMessage, setIssueMessage] = useState('');
  const [isReportingIssue, setIsReportingIssue] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [adjustmentType, setAdjustmentType] =
    useState<FulfillmentAdjustmentType>('shortage');
  const [adjustmentProductListingId, setAdjustmentProductListingId] = useState('none');
  const [shortageQuantity, setShortageQuantity] = useState('1');
  const [substitutionDescription, setSubstitutionDescription] = useState('');
  const [adjustmentNote, setAdjustmentNote] = useState('');
  const [isApplyingAdjustment, setIsApplyingAdjustment] = useState(false);
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);

  useEffect(() => {
    if (products.length === 0) {
      fetchProducts();
    }
  }, [fetchProducts, products.length]);

  useEffect(() => {
    let isMounted = true;

    async function loadVendorOrders() {
      if (!vendor?.id) {
        setVendorOrders([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const response = await fetch('/api/operator/orders');
        const payload = await response.json();
        const orders = Array.isArray(payload?.data)
          ? payload.data.map((order: Order) => hydrateOrder(order))
          : [];

        if (isMounted) {
          setVendorOrders(orders);
        }
      } catch (error) {
        console.error('Failed to load vendor orders.', error);
        if (isMounted) {
          setVendorOrders([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadVendorOrders();

    return () => {
      isMounted = false;
    };
  }, [vendor?.id]);

  const filteredOrders = vendorOrders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.deliveryAddress.area.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      selectedStatus === 'all' || order.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      case 'confirmed': return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      case 'preparing': return 'bg-orange-100 text-orange-800 hover:bg-orange-100';
      case 'ready': return 'bg-purple-100 text-purple-800 hover:bg-purple-100';
      case 'in-transit': return 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100';
      case 'delivered': return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'cancelled': return 'bg-red-100 text-red-800 hover:bg-red-100';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return Clock;
      case 'confirmed': return CheckCircle;
      case 'preparing': return Package;
      case 'ready': return Package;
      case 'in-transit': return Truck;
      case 'delivered': return CheckCircle;
      case 'cancelled': return XCircle;
      default: return Clock;
    }
  };

  const getProductById = (productId: string) => {
    return products.find((product) => product.id === productId);
  };

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingOrderId(orderId);

    try {
      const response = await fetch(`/api/operator/orders/${orderId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nextStatus: newStatus,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error?.message ?? 'Failed to update order status.');
      }

      const updatedOrder = hydrateOrder(payload.data as Order);

      setVendorOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderId ? updatedOrder : order,
        ),
      );
      setSelectedOrder((currentOrder) =>
        currentOrder?.id === orderId ? updatedOrder : currentOrder,
      );
    } catch (error) {
      console.error('Failed to update operator order status.', error);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleReportIssue = async () => {
    if (!selectedOrder || !issueMessage.trim()) {
      setIssueError('Describe the fulfillment issue before submitting.');
      return;
    }

    setIsReportingIssue(true);
    setIssueError(null);

    try {
      const response = await fetch(`/api/operator/orders/${selectedOrder.id}/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          issueType,
          message: issueMessage.trim(),
          affectedProductListingId:
            affectedProductListingId === 'none' ? undefined : affectedProductListingId,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error?.message ?? 'Failed to report fulfillment issue.');
      }

      const updatedOrder = hydrateOrder(payload.data as Order);

      setVendorOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === selectedOrder.id ? updatedOrder : order,
        ),
      );
      setSelectedOrder(updatedOrder);
      setIssueMessage('');
      setAffectedProductListingId('none');
      setIssueType('stock-shortage');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to report fulfillment issue.';
      setIssueError(message);
      console.error('Failed to report fulfillment issue.', error);
    } finally {
      setIsReportingIssue(false);
    }
  };

  const handleApplyFulfillmentAdjustment = async () => {
    if (!selectedOrder || adjustmentProductListingId === 'none') {
      setAdjustmentError('Choose the affected item before applying an action.');
      return;
    }

    const parsedShortageQuantity = Number.parseInt(shortageQuantity, 10);

    if (
      ['shortage', 'unavailable'].includes(adjustmentType) &&
      (!Number.isInteger(parsedShortageQuantity) || parsedShortageQuantity <= 0)
    ) {
      setAdjustmentError('Enter a positive shortage quantity.');
      return;
    }

    if (adjustmentType === 'substitution' && !substitutionDescription.trim()) {
      setAdjustmentError('Describe the proposed substitution.');
      return;
    }

    setIsApplyingAdjustment(true);
    setAdjustmentError(null);

    try {
      const response = await fetch(
        `/api/operator/orders/${selectedOrder.id}/items/${adjustmentProductListingId}/fulfillment-adjustment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            adjustmentType,
            shortageQuantity: ['shortage', 'unavailable'].includes(adjustmentType)
              ? parsedShortageQuantity
              : undefined,
            substitutionDescription: substitutionDescription.trim() || undefined,
            note: adjustmentNote.trim() || undefined,
          }),
        },
      );
      const payload = await response.json();

      if (!response.ok || !payload?.data) {
        throw new Error(
          payload?.error?.message ?? 'Failed to apply fulfillment adjustment.',
        );
      }

      const updatedOrder = hydrateOrder(payload.data as Order);

      setVendorOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === selectedOrder.id ? updatedOrder : order,
        ),
      );
      setSelectedOrder(updatedOrder);
      setAdjustmentType('shortage');
      setAdjustmentProductListingId('none');
      setShortageQuantity('1');
      setSubstitutionDescription('');
      setAdjustmentNote('');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to apply fulfillment adjustment.';
      setAdjustmentError(message);
      console.error('Failed to apply fulfillment adjustment.', error);
    } finally {
      setIsApplyingAdjustment(false);
    }
  };

  const openOrderDetail = (order: Order) => {
    setSelectedOrder(order);
    setIssueError(null);
    setIssueMessage('');
    setAffectedProductListingId('none');
    setAdjustmentError(null);
    setAdjustmentProductListingId('none');
    setAdjustmentNote('');
    setSubstitutionDescription('');
    setShortageQuantity('1');
    setIsOrderDetailOpen(true);
  };

  const orderStats = {
    total: vendorOrders.length,
    pending: vendorOrders.filter((order) => order.status === 'pending').length,
    confirmed: vendorOrders.filter((order) => order.status === 'confirmed').length,
    preparing: vendorOrders.filter((order) => order.status === 'preparing').length,
    delivered: vendorOrders.filter((order) => order.status === 'delivered').length,
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground mt-1">
            Loading vendor order operations...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Orders</h1>
        <p className="text-muted-foreground mt-1">
          Manage and track your customer orders
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{orderStats.total}</div>
              <div className="text-sm text-muted-foreground">Total Orders</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{orderStats.pending}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{orderStats.confirmed}</div>
              <div className="text-sm text-muted-foreground">Confirmed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{orderStats.preparing}</div>
              <div className="text-sm text-muted-foreground">Preparing</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{orderStats.delivered}</div>
              <div className="text-sm text-muted-foreground">Delivered</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="preparing">Preparing</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="in-transit">In Transit</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order Management</CardTitle>
          <CardDescription>
            {filteredOrders.length} orders found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No orders found</h3>
              <p className="text-muted-foreground">
                No orders match your current filters
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y divide-border">
                  {filteredOrders.map((order) => {
                    const StatusIcon = getStatusIcon(order.status);
                    return (
                      <tr key={order.id} className="hover:bg-muted/30">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-foreground">
                              {order.id}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {getPaymentStatusLabel(order.paymentStatus, order.paymentMethod)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-foreground">
                              Customer #{order.buyerId}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {order.deliveryAddress.area}, {order.deliveryAddress.lga}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-foreground">
                            {order.items.length} item{order.items.length > 1 ? 's' : ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-foreground">
                            {formatCurrency(order.totalAmount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getStatusColor(order.status)}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {order.status.replace('-', ' ')}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openOrderDetail(order)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={updatingOrderId === order.id}
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {getAllowedNextOrderStatuses(order.status).map((nextStatus) => (
                                  <DropdownMenuItem
                                    key={nextStatus}
                                    onClick={() => handleStatusUpdate(order.id, nextStatus)}
                                  >
                                    {nextStatus === 'confirmed'
                                      ? 'Confirm Order'
                                      : nextStatus === 'preparing'
                                        ? 'Start Preparing'
                                        : nextStatus === 'ready'
                                          ? 'Mark as Ready'
                                          : nextStatus === 'in-transit'
                                            ? 'Mark in Transit'
                                            : nextStatus === 'delivered'
                                              ? 'Mark as Delivered'
                                              : 'Cancel Order'}
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

      <Dialog open={isOrderDetailOpen} onOpenChange={setIsOrderDetailOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Order Details - {selectedOrder?.id}</DialogTitle>
            <DialogDescription>
              Complete order information and management
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Order Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Order ID:</span>
                      <span className="font-medium">{selectedOrder.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date:</span>
                      <span>{formatDate(selectedOrder.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge className={getStatusColor(selectedOrder.status)}>
                        {selectedOrder.status.replace('-', ' ')}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment:</span>
                      <span>{getPaymentMethodLabel(selectedOrder.paymentMethod)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Payment policy:</span>
                      <span className="max-w-xs text-right text-sm">
                        {getFulfillmentPaymentPolicyCopy(selectedOrder.paymentMethod)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-bold">{formatCurrency(selectedOrder.totalAmount)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <MapPin className="w-5 h-5 mr-2" />
                      Delivery Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p>{selectedOrder.deliveryAddress.street}</p>
                    <p>{selectedOrder.deliveryAddress.area}</p>
                    <p>{selectedOrder.deliveryAddress.lga}, {selectedOrder.deliveryAddress.state}</p>
                    {selectedOrder.deliveryAddress.landmark && (
                      <p className="text-muted-foreground">
                        Landmark: {selectedOrder.deliveryAddress.landmark}
                      </p>
                    )}
                    {selectedOrder.notes && (
                      <div className="mt-3 rounded-lg bg-muted p-3">
                        <p className="text-sm font-medium">Special Instructions:</p>
                        <p className="text-sm text-muted-foreground">{selectedOrder.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Order Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item, index) => {
                      const product = getProductById(item.productId);
                      return (
                        <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center space-x-3">
                            {product && (
                              <div className="relative h-12 w-12 overflow-hidden rounded-lg">
                                <Image
                                  src={product.images[0]}
                                  alt={product.name}
                                  fill
                                  sizes="48px"
                                  className="object-cover"
                                />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{product?.name || 'Product'}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.quantity} × {formatCurrency(item.unitPrice)}
                              </p>
                              {getItemFulfillmentStatusLabel(item.substitutionStatus) && (
                                <Badge variant="outline" className="mt-2">
                                  {getItemFulfillmentStatusLabel(item.substitutionStatus)}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="font-medium">{formatCurrency(item.totalPrice)}</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Stock/Substitution Action</CardTitle>
                  <CardDescription>
                    Records item-level fulfillment state and adjusts reserved stock when units cannot be fulfilled.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      value={adjustmentProductListingId}
                      onValueChange={setAdjustmentProductListingId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Affected item" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select item</SelectItem>
                        {selectedOrder.items.map((item) => {
                          const product = getProductById(item.productId);
                          return (
                            <SelectItem key={item.productId} value={item.productId}>
                              {product?.name || item.productId}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>

                    <Select
                      value={adjustmentType}
                      onValueChange={(value) =>
                        setAdjustmentType(value as FulfillmentAdjustmentType)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Action" />
                      </SelectTrigger>
                      <SelectContent>
                        {fulfillmentAdjustmentOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {['shortage', 'unavailable'].includes(adjustmentType) && (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">
                        Short quantity
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={shortageQuantity}
                        onChange={(event) => setShortageQuantity(event.target.value)}
                      />
                    </div>
                  )}

                  {adjustmentType === 'substitution' && (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">
                        Proposed substitution
                      </label>
                      <textarea
                        value={substitutionDescription}
                        onChange={(event) =>
                          setSubstitutionDescription(event.target.value)
                        }
                        maxLength={300}
                        rows={3}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Example: Replace 2kg Roma tomatoes with 2kg plum tomatoes at the same price."
                      />
                    </div>
                  )}

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Operations note
                    </label>
                    <textarea
                      value={adjustmentNote}
                      onChange={(event) => setAdjustmentNote(event.target.value)}
                      maxLength={500}
                      rows={3}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Add any context operations should know."
                    />
                  </div>

                  {adjustmentError && (
                    <p className="text-sm text-red-600">{adjustmentError}</p>
                  )}

                  <div className="flex justify-end">
                    <Button
                      onClick={handleApplyFulfillmentAdjustment}
                      disabled={
                        isApplyingAdjustment || adjustmentProductListingId === 'none'
                      }
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      {isApplyingAdjustment ? 'Applying...' : 'Apply Action'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Report Fulfillment Issue
                  </CardTitle>
                  <CardDescription>
                    Adds an operations note to this order timeline for admin follow-up.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      value={issueType}
                      onValueChange={(value) => setIssueType(value as FulfillmentIssueType)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Issue type" />
                      </SelectTrigger>
                      <SelectContent>
                        {fulfillmentIssueOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={affectedProductListingId}
                      onValueChange={setAffectedProductListingId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Affected item" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Whole order</SelectItem>
                        {selectedOrder.items.map((item) => {
                          const product = getProductById(item.productId);
                          return (
                            <SelectItem key={item.productId} value={item.productId}>
                              {product?.name || item.productId}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <textarea
                    value={issueMessage}
                    onChange={(event) => setIssueMessage(event.target.value)}
                    maxLength={500}
                    rows={4}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Explain what happened and what action you need from operations."
                  />

                  {issueError && (
                    <p className="text-sm text-red-600">{issueError}</p>
                  )}

                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs text-muted-foreground">
                      {issueMessage.length}/500 characters
                    </p>
                    <Button
                      onClick={handleReportIssue}
                      disabled={isReportingIssue || !issueMessage.trim()}
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      {isReportingIssue ? 'Reporting...' : 'Report Issue'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {(selectedOrder.statusHistory ?? []).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Operations Timeline</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(selectedOrder.statusHistory ?? []).map((event) => (
                      <div key={event.id} className="rounded-lg border p-3">
                        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                          <p className="font-medium">{event.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(event.createdAt)}
                          </p>
                        </div>
                        {event.note && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {event.note}
                          </p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorOrders;
