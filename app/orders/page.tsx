'use client'

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Eye, Package, RotateCcw } from 'lucide-react';
import { useOrderStore } from '../../stores/orderStore';
import { useProductStore } from '../../stores/productStore';
import { useBuyerAuthGuard } from '../../lib/auth/use-buyer-auth-guard';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { formatCurrency, formatDate } from '../../utils/format';
import Image from 'next/image';

const Orders: React.FC = () => {
  const { isChecking } = useBuyerAuthGuard();
  const { orders, fetchOrders, isLoading, cancelOrder } = useOrderStore();
  const { products, fetchProducts } = useProductStore();
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (products.length === 0) {
      fetchProducts();
    }
  }, [fetchProducts, products.length]);

  const getProductById = (productId: string) => {
    return products.find(p => p.id === productId);
  };

  const getStatusColor = (status: string) => {
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

  const getExceptionClasses = (state: 'reported' | 'recovering') =>
    state === 'recovering'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : 'border-amber-200 bg-amber-50 text-amber-800';

  const handleCancelOrder = async (orderId: string) => {
    setCancellingOrderId(orderId);

    try {
      await cancelOrder(orderId);
    } catch (error) {
      console.error('Failed to cancel order.', error);
    } finally {
      setCancellingOrderId(null);
    }
  };

  if (isChecking || isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  <div className="flex justify-between items-center mb-8">
    <h1 className="text-3xl font-bold">My Orders</h1>
    <Button variant="outline" asChild>
      <Link href="/products">Continue Shopping</Link>
    </Button>
  </div>

  {orders.length === 0 ? (
    <Card>
      <CardContent className="text-center py-12">
        <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No orders yet</h3>
        <p className="text-muted-foreground mb-6">
          You haven&apos;t placed any orders yet. Start shopping to see your orders here.
        </p>
        <Button asChild>
          <Link href="/products">Browse Products</Link>
        </Button>
      </CardContent>
    </Card>
  ) : (
    <div className="space-y-6">
      {orders.map((order) => (
        <Card key={order.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">Order #{order.id}</CardTitle>
                <CardDescription>
                  Placed on {formatDate(order.createdAt)}
                </CardDescription>
              </div>
              <div className="text-right">
                <Badge className={getStatusColor(order.status)}>
                  {order.status.replace('-', ' ')}
                </Badge>
                <p className="text-lg font-bold mt-1">
                  {formatCurrency(order.totalAmount)}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {/* Order Items */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {order.items.slice(0, 3).map((item, index) => {
                  const product = getProductById(item.productId);
                  return (
                    <div key={index} className="flex items-center space-x-3">
                      {product && (
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden">
                          <Image
                            src={product.images[0]}
                            alt={product.name}
                            width={48}
                            height={48}
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {product?.name || 'Product'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Qty: {item.quantity}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {order.items.length > 3 && (
                  <div className="flex items-center justify-center text-muted-foreground">
                    <p className="text-sm">+{order.items.length - 3} more items</p>
                  </div>
                )}
              </div>

              {/* Order Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Delivery Address</p>
                  <p className="text-sm">
                    {order.deliveryAddress.area}, {order.deliveryAddress.lga}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
                  <p className="text-sm capitalize">
                    {order.paymentMethod.replace('-', ' ')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payment Status</p>
                  <Badge variant={order.paymentStatus === 'completed' ? 'default' : 'secondary'}>
                    {order.paymentStatus}
                  </Badge>
                </div>
              </div>

              {order.deliveryException ? (
                <div
                  className={`rounded-lg border px-4 py-3 ${getExceptionClasses(order.deliveryException.state)}`}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {order.deliveryException.state === 'recovering'
                          ? 'Delivery issue resolved and reassignment in progress'
                          : 'Delivery issue reported'}
                      </p>
                      <p className="text-sm">{order.deliveryException.message}</p>
                      <p className="text-xs opacity-80">
                        Updated {formatDate(order.deliveryException.reportedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/order-confirmation/${order.id}`}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Link>
                  </Button>
                  
                  {order.status === 'delivered' && (
                    <Button variant="outline" size="sm">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reorder
                    </Button>
                  )}
                </div>

                {order.status === 'pending' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={cancellingOrderId === order.id}
                    onClick={() => void handleCancelOrder(order.id)}
                  >
                    {cancellingOrderId === order.id ? 'Cancelling...' : 'Cancel Order'}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )}
</div>
  );
};

export default Orders;
