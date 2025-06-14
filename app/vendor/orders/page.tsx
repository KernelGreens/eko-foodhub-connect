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
  Phone,
  MapPin
} from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { useOrderStore } from '../../../stores/orderStore';
import { useProductStore } from '../../../stores/productStore';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../../components/ui/dropdown-menu';
import { formatCurrency, formatDate } from '../../../utils/format';
// import VendorLayout from '../../components/Vendor/Layout';
import { Order, OrderStatus } from '../../../types';

const VendorOrders: React.FC = () => {
  const { vendor } = useAuthStore();
  const { orders, fetchOrders, updateOrderStatus } = useOrderStore();
  const { products } = useProductStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Mock vendor orders - in real app, filter by vendor ID
  const vendorOrders: Order[] = [
    {
      id: 'ORD-001',
      buyerId: 'buyer-1',
      vendorId: vendor?.id || '1',
      items: [
        { productId: '1', quantity: 10, unitPrice: 800, totalPrice: 8000 },
        { productId: '2', quantity: 5, unitPrice: 300, totalPrice: 1500 }
      ],
      totalAmount: 10000,
      status: 'pending',
      paymentStatus: 'completed',
      paymentMethod: 'momo',
      deliveryAddress: {
        street: '123 Main Street',
        area: 'Ikeja',
        lga: 'Ikeja',
        state: 'Lagos',
        landmark: 'Near Computer Village'
      },
      deliveryFee: 500,
      notes: 'Please call before delivery',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      id: 'ORD-002',
      buyerId: 'buyer-2',
      vendorId: vendor?.id || '1',
      items: [
        { productId: '3', quantity: 25, unitPrice: 1200, totalPrice: 30000 }
      ],
      totalAmount: 30500,
      status: 'confirmed',
      paymentStatus: 'completed',
      paymentMethod: 'bank-transfer',
      deliveryAddress: {
        street: '456 Lagos Street',
        area: 'Victoria Island',
        lga: 'Lagos Island',
        state: 'Lagos'
      },
      deliveryFee: 500,
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    },
    {
      id: 'ORD-003',
      buyerId: 'buyer-3',
      vendorId: vendor?.id || '1',
      items: [
        { productId: '1', quantity: 20, unitPrice: 750, totalPrice: 15000 }
      ],
      totalAmount: 15500,
      status: 'preparing',
      paymentStatus: 'completed',
      paymentMethod: 'card',
      deliveryAddress: {
        street: '789 Market Road',
        area: 'Surulere',
        lga: 'Surulere',
        state: 'Lagos'
      },
      deliveryFee: 500,
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 30 * 60 * 1000),
    }
  ];

  const filteredOrders = vendorOrders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.deliveryAddress.area.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    
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
    return products.find(p => p.id === productId);
  };

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    await updateOrderStatus(orderId, newStatus);
  };

  const openOrderDetail = (order: Order) => {
    setSelectedOrder(order);
    setIsOrderDetailOpen(true);
  };

  const orderStats = {
    total: vendorOrders.length,
    pending: vendorOrders.filter(o => o.status === 'pending').length,
    confirmed: vendorOrders.filter(o => o.status === 'confirmed').length,
    preparing: vendorOrders.filter(o => o.status === 'preparing').length,
    delivered: vendorOrders.filter(o => o.status === 'delivered').length,
  };

  return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track your customer orders
          </p>
        </div>

        {/* Stats Cards */}
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

        {/* Filters */}
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

        {/* Orders Table */}
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
                                {order.paymentMethod.replace('-', ' ')}
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
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {order.status === 'pending' && (
                                    <DropdownMenuItem onClick={() => handleStatusUpdate(order.id, 'confirmed')}>
                                      Confirm Order
                                    </DropdownMenuItem>
                                  )}
                                  {order.status === 'confirmed' && (
                                    <DropdownMenuItem onClick={() => handleStatusUpdate(order.id, 'preparing')}>
                                      Start Preparing
                                    </DropdownMenuItem>
                                  )}
                                  {order.status === 'preparing' && (
                                    <DropdownMenuItem onClick={() => handleStatusUpdate(order.id, 'ready')}>
                                      Mark as Ready
                                    </DropdownMenuItem>
                                  )}
                                  {order.status === 'ready' && (
                                    <DropdownMenuItem onClick={() => handleStatusUpdate(order.id, 'in-transit')}>
                                      Mark in Transit
                                    </DropdownMenuItem>
                                  )}
                                  {order.status === 'in-transit' && (
                                    <DropdownMenuItem onClick={() => handleStatusUpdate(order.id, 'delivered')}>
                                      Mark as Delivered
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => handleStatusUpdate(order.id, 'cancelled')}>
                                    Cancel Order
                                  </DropdownMenuItem>
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

        {/* Order Detail Dialog */}
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
                  {/* Order Info */}
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
                        <span className="capitalize">{selectedOrder.paymentMethod.replace('-', ' ')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total:</span>
                        <span className="font-bold">{formatCurrency(selectedOrder.totalAmount)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Delivery Address */}
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
                        <div className="mt-3 p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium">Special Instructions:</p>
                          <p className="text-sm text-muted-foreground">{selectedOrder.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Order Items */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Order Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedOrder.items.map((item, index) => {
                        const product = getProductById(item.productId);
                        return (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              {product && (
                                <img
                                  src={product.images[0]}
                                  alt={product.name}
                                  className="w-12 h-12 rounded-lg object-cover"
                                />
                              )}
                              <div>
                                <p className="font-medium">{product?.name || 'Product'}</p>
                                <p className="text-sm text-muted-foreground">
                                  {item.quantity} × {formatCurrency(item.unitPrice)}
                                </p>
                              </div>
                            </div>
                            <p className="font-medium">{formatCurrency(item.totalPrice)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
  );
};

export default VendorOrders;