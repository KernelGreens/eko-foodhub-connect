'use client'

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CheckCircle, Package, MapPin, CreditCard, Clock, XCircle } from 'lucide-react';
import { useOrderStore } from '../../../stores/orderStore';
import { useProductStore } from '../../../stores/productStore';
import { useBuyerAuthGuard } from '../../../lib/auth/use-buyer-auth-guard';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { formatCurrency, formatDate, formatRelativeTime } from '../../../utils/format';
import Image from 'next/image';
import { getOrderStatusLabel, isFrontendOrderCancelable } from '../../../lib/orders/order-view-model';

const OrderConfirmation: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { isChecking } = useBuyerAuthGuard();
  const { currentOrder, fetchOrderById, cancelOrder } = useOrderStore();
  const { products, fetchProducts } = useProductStore();
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrderById(orderId);
    }
  }, [orderId, fetchOrderById]);

  useEffect(() => {
    if (products.length === 0) {
      fetchProducts();
    }
  }, [fetchProducts, products.length]);

  if (isChecking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Checking your account...</h1>
        <p className="text-muted-foreground mb-6">Redirecting you to sign in if needed.</p>
      </div>
    );
  }

  if (!currentOrder) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Order not found</h1>
        <p className="text-muted-foreground mb-6">The order you&apos;re looking for doesn&apos;t exist.</p>
        <Button asChild>
          <Link href="/products">Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  const getProductById = (productId: string) => {
    return products.find(p => p.id === productId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'preparing': return 'bg-orange-100 text-orange-800';
      case 'ready': return 'bg-purple-100 text-purple-800';
      case 'in-transit': return 'bg-indigo-100 text-indigo-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCancelOrder = async () => {
    if (!currentOrder) {
      return;
    }

    setIsCancelling(true);

    try {
      await cancelOrder(currentOrder.id);
      await fetchOrderById(currentOrder.id);
    } catch (error) {
      console.error('Failed to cancel order.', error);
    } finally {
      setIsCancelling(false);
    }
  };

  const isCancelled = currentOrder.status === 'cancelled';
  const headerIcon = isCancelled ? XCircle : CheckCircle;
  const HeaderIcon = headerIcon;
  const headerTitle = isCancelled ? 'Order Cancelled' : 'Order Confirmed!';
  const headerCopy = isCancelled
    ? 'This order has been cancelled. You can continue shopping whenever you are ready.'
    : 'Thank you for your order. We\'ll send you updates as your order progresses.';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Success Header */}
      <div className="text-center mb-8">
        <HeaderIcon className={`w-16 h-16 mx-auto mb-4 ${isCancelled ? 'text-red-500' : 'text-green-500'}`} />
        <h1 className="text-3xl font-bold text-foreground mb-2">{headerTitle}</h1>
        <p className="text-lg text-muted-foreground">
          {headerCopy}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="w-5 h-5" />
                <span>Order Details</span>
              </CardTitle>
              <CardDescription>Order #{currentOrder.id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Order Date</p>
                  <p className="font-medium">{formatDate(currentOrder.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                  <p className="font-medium">{formatCurrency(currentOrder.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Order Status</p>
                  <Badge className={getStatusColor(currentOrder.status)}>
                    {currentOrder.status.replace('-', ' ')}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payment Status</p>
                  <Badge className={getPaymentStatusColor(currentOrder.paymentStatus)}>
                    {currentOrder.paymentStatus}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Items Ordered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentOrder.items.map((item, index) => {
                  const product = getProductById(item.productId);
                  return (
                    <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                      {product && (
                        <Image
                            src={product.images[0]}
                            alt={product.name}
                            className="w-16 h-16 rounded-lg object-cover"
                            width={48}
                            height={48}
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium">{product?.name || 'Product'}</h4>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} × {formatCurrency(item.unitPrice)}
                        </p>
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
              <CardTitle>Order Timeline</CardTitle>
              <CardDescription>Track the latest status changes for this order.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(currentOrder.statusHistory ?? []).map((event, index) => (
                  <div key={event.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="mt-1 h-3 w-3 rounded-full bg-primary" />
                      {index < (currentOrder.statusHistory?.length ?? 0) - 1 && (
                        <div className="mt-2 w-px flex-1 bg-border" />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="font-medium">{event.label || getOrderStatusLabel(event.status)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(event.createdAt)} · {formatRelativeTime(event.createdAt)}
                      </p>
                      {event.note && (
                        <p className="mt-1 text-sm text-muted-foreground">{event.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Delivery Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Delivery Address</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="font-medium">{currentOrder.deliveryAddress.street}</p>
                <p>{currentOrder.deliveryAddress.area}</p>
                <p>{currentOrder.deliveryAddress.lga}, {currentOrder.deliveryAddress.state}</p>
                {currentOrder.deliveryAddress.landmark && (
                  <p className="text-sm text-muted-foreground">
                    Landmark: {currentOrder.deliveryAddress.landmark}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5" />
                <span>Payment Method</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="capitalize">{currentOrder.paymentMethod.replace('-', ' ')}</p>
              {currentOrder.paymentMethod === 'cash-on-delivery' && (
                <p className="text-sm text-muted-foreground mt-1">
                  Please have exact change ready for delivery
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(currentOrder.totalAmount - currentOrder.deliveryFee)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span>{formatCurrency(currentOrder.deliveryFee)}</span>
              </div>
              <hr />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>{formatCurrency(currentOrder.totalAmount)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Estimated Delivery */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Estimated Delivery</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">
                {currentOrder.deliveryDate 
                  ? formatDate(currentOrder.deliveryDate)
                  : 'Within 24-48 hours'
                }
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                We&apos;ll notify you when your order is on the way
              </p>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-3">
            <Button className="w-full" asChild>
              <Link href="/orders">View All Orders</Link>
            </Button>
            {isFrontendOrderCancelable(currentOrder.status) && (
              <Button
                variant="destructive"
                className="w-full"
                disabled={isCancelling}
                onClick={() => void handleCancelOrder()}
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Order'}
              </Button>
            )}
            <Button variant="outline" className="w-full" asChild>
              <Link href="/products">Continue Shopping</Link>
            </Button>
          </div>

          {/* Support */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-2">Need Help?</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Contact our support team if you have any questions about your order.
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
