'use client'

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Package, 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { useProductStore } from '../../../stores/productStore';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { formatCurrency } from '../../../utils/format';
import { parseJsonResponse } from '../../../lib/http/parse-json-response';
// import VendorLayout from '../../../components/Vendor/Layout';

type VendorOnboardingSnapshot = {
  activationReady: boolean;
  launchReady: boolean;
  listingCount: number;
  steps: Array<{
    id: string;
    title: string;
    complete: boolean;
  }>;
};

type VendorOnboardingPayload = {
  data?: VendorOnboardingSnapshot | null;
};

const VendorDashboard: React.FC = () => {
  const { vendor } = useAuthStore();
  const { products, fetchProducts } = useProductStore();
  const [onboarding, setOnboarding] = useState<VendorOnboardingSnapshot | null>(null);
  
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    let isMounted = true;

    async function loadOnboarding() {
      try {
        const response = await fetch('/api/vendor/onboarding', {
          cache: 'no-store',
        });
        const payload = await parseJsonResponse<VendorOnboardingPayload>(response);

        if (response.ok && isMounted) {
          setOnboarding(payload?.data ?? null);
        }
      } catch (error) {
        console.error('Failed to load vendor onboarding snapshot.', error);
      }
    }

    void loadOnboarding();

    return () => {
      isMounted = false;
    };
  }, []);

  const vendorProducts = products.filter(p => p.vendorId === vendor?.id);
  
  const stats = [
    {
      label: 'Total Revenue',
      value: formatCurrency(vendor?.totalSales || 0),
      change: '+12.5%',
      changeType: 'positive' as const,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: 'Total Products',
      value: vendorProducts.length.toString(),
      change: '+3',
      changeType: 'positive' as const,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: 'Active Orders',
      value: '12',
      change: '+8',
      changeType: 'positive' as const,
      icon: ShoppingCart,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      label: 'Customer Rating',
      value: vendor?.rating?.toFixed(1) || '0.0',
      change: '+0.2',
      changeType: 'positive' as const,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  const recentOrders = [
    { id: 'ORD-001', customer: 'Kemi Oladele', amount: 15000, status: 'pending', time: '2 hours ago' },
    { id: 'ORD-002', customer: 'John Adebayo', amount: 8500, status: 'confirmed', time: '4 hours ago' },
    { id: 'ORD-003', customer: 'Sarah Ibrahim', amount: 12000, status: 'preparing', time: '6 hours ago' },
  ];

  const lowStockProducts = vendorProducts.filter(p => p.stock < 10);

  return (
      <div className="space-y-6">
        {onboarding && !onboarding.launchReady ? (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                  <p className="font-medium text-emerald-900">
                    Vendor activation is in progress
                  </p>
                </div>
                <p className="mt-1 text-sm text-emerald-800">
                  {onboarding.steps.filter((step) => step.complete).length} of{' '}
                  {onboarding.steps.length} onboarding steps completed. Finish setup to
                  make this vendor launch ready.
                </p>
              </div>
              <Button asChild>
                <Link href="/vendor/onboarding">Open onboarding checklist</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {/* Welcome Section */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {vendor?.businessName}
            </h1>
            <p className="text-muted-foreground mt-1">
              Here&apos;s what&apos;s happening with your business today
            </p>
          </div>
          <Button className="flex items-center space-x-2" asChild>
            <Link href="/vendor/products">
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <div className="flex items-center mt-1">
                      {stat.changeType === 'positive' ? (
                        <ArrowUpRight className="w-4 h-4 text-green-600" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-red-600" />
                      )}
                      <span className={`text-sm font-medium ${
                        stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stat.change}
                      </span>
                      <span className="text-sm text-muted-foreground ml-1">vs last month</span>
                    </div>
                  </div>
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>Latest orders from your customers</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{order.customer}</p>
                        <p className="text-xs text-muted-foreground">{order.id}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">{formatCurrency(order.amount)}</p>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={order.status === 'pending' ? 'secondary' : 'default'}
                          className="text-xs"
                        >
                          {order.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{order.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Low Stock Alert */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <span>Low Stock Alert</span>
                    {lowStockProducts.length > 0 && (
                      <Badge variant="destructive">{lowStockProducts.length}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Products running low on inventory</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  Manage Stock
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {lowStockProducts.length === 0 ? (
                <div className="text-center py-6">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">All products are well stocked!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lowStockProducts.slice(0, 3).map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <div>
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{product.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="destructive" className="text-xs">
                          {product.stock} {product.unit} left
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks to manage your business</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-20 flex flex-col space-y-2">
                <Plus className="w-6 h-6" />
                <span>Add New Product</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col space-y-2">
                <Package className="w-6 h-6" />
                <span>Update Inventory</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col space-y-2">
                <Clock className="w-6 h-6" />
                <span>Process Orders</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
  );
};

export default VendorDashboard;
