'use client'
import React from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  Users, 
  ShoppingCart,
  Calendar,
  BarChart3,
  PieChart
} from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { formatCurrency } from '../../../utils/format';

const VendorAnalytics: React.FC = () => {
  const { vendor } = useAuthStore();

  // Mock analytics data
  const analyticsData = {
    revenue: {
      total: 2500000,
      thisMonth: 450000,
      lastMonth: 380000,
      growth: 18.4
    },
    orders: {
      total: 1250,
      thisMonth: 185,
      lastMonth: 156,
      growth: 18.6
    },
    customers: {
      total: 420,
      new: 35,
      returning: 150,
      growth: 12.3
    },
    products: {
      total: 45,
      active: 42,
      lowStock: 8,
      outOfStock: 3
    }
  };

  const salesData = [
    { month: 'Jan', revenue: 320000, orders: 145 },
    { month: 'Feb', revenue: 280000, orders: 132 },
    { month: 'Mar', revenue: 350000, orders: 168 },
    { month: 'Apr', revenue: 420000, orders: 195 },
    { month: 'May', revenue: 380000, orders: 156 },
    { month: 'Jun', revenue: 450000, orders: 185 },
  ];

  const topProducts = [
    { name: 'Fresh Tomatoes', sales: 85000, quantity: 850, growth: 15.2 },
    { name: 'White Rice (Local)', sales: 72000, quantity: 240, growth: 8.7 },
    { name: 'Sweet Plantains', sales: 45000, quantity: 450, growth: 22.1 },
    { name: 'Fresh Pepper', sales: 38000, quantity: 380, growth: -5.3 },
    { name: 'Yam Tubers', sales: 32000, quantity: 160, growth: 12.8 },
  ];

  const customerSegments = [
    { segment: 'Restaurants', percentage: 45, value: 1125000 },
    { segment: 'Retailers', percentage: 30, value: 750000 },
    { segment: 'Individual Buyers', percentage: 20, value: 500000 },
    { segment: 'Wholesalers', percentage: 5, value: 125000 },
  ];

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Track your business performance and insights
            </p>
          </div>
          <div className="flex space-x-2">
            <Select defaultValue="30days">
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="90days">Last 90 days</SelectItem>
                <SelectItem value="1year">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(analyticsData.revenue.total)}
                  </p>
                  <div className="flex items-center mt-1">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-600 ml-1">
                      +{analyticsData.revenue.growth}%
                    </span>
                    <span className="text-sm text-muted-foreground ml-1">vs last month</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold text-foreground">
                    {analyticsData.orders.total.toLocaleString()}
                  </p>
                  <div className="flex items-center mt-1">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-600 ml-1">
                      +{analyticsData.orders.growth}%
                    </span>
                    <span className="text-sm text-muted-foreground ml-1">vs last month</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
                  <p className="text-2xl font-bold text-foreground">
                    {analyticsData.customers.total}
                  </p>
                  <div className="flex items-center mt-1">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-600 ml-1">
                      +{analyticsData.customers.growth}%
                    </span>
                    <span className="text-sm text-muted-foreground ml-1">vs last month</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Products</p>
                  <p className="text-2xl font-bold text-foreground">
                    {analyticsData.products.active}
                  </p>
                  <div className="flex items-center mt-1">
                    <span className="text-sm text-muted-foreground">
                      {analyticsData.products.lowStock} low stock
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Revenue Trend
              </CardTitle>
              <CardDescription>Monthly revenue over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {salesData.map((data, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 text-sm font-medium">{data.month}</div>
                      <div className="flex-1 bg-muted rounded-full h-2 w-32">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${(data.revenue / 500000) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatCurrency(data.revenue)}</div>
                      <div className="text-xs text-muted-foreground">{data.orders} orders</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Customer Segments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChart className="w-5 h-5 mr-2" />
                Customer Segments
              </CardTitle>
              <CardDescription>Revenue breakdown by customer type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customerSegments.map((segment, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full ${
                        index === 0 ? 'bg-blue-500' :
                        index === 1 ? 'bg-green-500' :
                        index === 2 ? 'bg-yellow-500' : 'bg-purple-500'
                      }`} />
                      <span className="text-sm font-medium">{segment.segment}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{segment.percentage}%</div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(segment.value)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Products</CardTitle>
            <CardDescription>Your best-selling products this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Product</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Revenue</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Quantity Sold</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((product, index) => (
                    <tr key={index} className="border-b hover:bg-muted/30">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            <span className="text-sm font-bold text-primary">#{index + 1}</span>
                          </div>
                          <span className="font-medium">{product.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium">{formatCurrency(product.sales)}</td>
                      <td className="py-3 px-4">{product.quantity.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span className={`text-sm font-medium ${
                          product.growth > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {product.growth > 0 ? '+' : ''}{product.growth}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Quick Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Peak Sales Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Morning (6-12)</span>
                  <span className="font-medium">35%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Afternoon (12-18)</span>
                  <span className="font-medium">45%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Evening (18-24)</span>
                  <span className="font-medium">20%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Average Order Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground mb-2">
                  {formatCurrency(2432)}
                </div>
                <div className="text-sm text-green-600 font-medium">
                  +12.5% from last month
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer Retention</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground mb-2">78%</div>
                <div className="text-sm text-muted-foreground">
                  Customers return within 30 days
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  );
};

export default VendorAnalytics;