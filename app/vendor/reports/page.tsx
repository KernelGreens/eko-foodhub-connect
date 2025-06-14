'use client'

import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp,
  DollarSign,
  Package,
  Users,
  BarChart3,
  PieChart,
  Filter
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { formatCurrency, formatDate } from '../../../utils/format';

const VendorReports: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('30days');
  const [selectedReport, setSelectedReport] = useState('sales');

  // Mock report data
  const reportData = {
    sales: {
      title: 'Sales Report',
      description: 'Comprehensive sales performance analysis',
      data: [
        { period: 'This Month', value: 450000, change: 18.4 },
        { period: 'Last Month', value: 380000, change: 12.1 },
        { period: 'This Quarter', value: 1250000, change: 15.7 },
        { period: 'Last Quarter', value: 1080000, change: 8.3 },
      ]
    },
    inventory: {
      title: 'Inventory Report',
      description: 'Stock levels and product performance',
      data: [
        { category: 'Vegetables', stock: 850, value: 425000 },
        { category: 'Fruits', stock: 620, value: 310000 },
        { category: 'Grains', stock: 1200, value: 720000 },
        { category: 'Tubers', stock: 450, value: 180000 },
      ]
    },
    customers: {
      title: 'Customer Report',
      description: 'Customer acquisition and retention metrics',
      data: [
        { segment: 'VIP Customers', count: 25, revenue: 875000 },
        { segment: 'Regular Customers', count: 120, revenue: 1200000 },
        { segment: 'New Customers', count: 45, revenue: 225000 },
        { segment: 'Inactive', count: 15, revenue: 0 },
      ]
    },
    financial: {
      title: 'Financial Report',
      description: 'Revenue, expenses, and profit analysis',
      data: [
        { metric: 'Total Revenue', amount: 2500000, percentage: 100 },
        { metric: 'Cost of Goods', amount: 1500000, percentage: 60 },
        { metric: 'Operating Expenses', amount: 400000, percentage: 16 },
        { metric: 'Net Profit', amount: 600000, percentage: 24 },
      ]
    }
  };

  const quickStats = {
    totalRevenue: 2500000,
    totalOrders: 1250,
    totalCustomers: 420,
    averageOrderValue: 2000,
    topProduct: 'Fresh Tomatoes',
    bestMonth: 'June 2024'
  };

  const exportOptions = [
    { label: 'Export as PDF', format: 'pdf' },
    { label: 'Export as Excel', format: 'xlsx' },
    { label: 'Export as CSV', format: 'csv' },
  ];

  const handleExport = (format: string) => {
    // Mock export functionality
    console.log(`Exporting ${selectedReport} report as ${format}`);
    // In real implementation, this would trigger file download
  };

  const getCurrentReportData = () => {
    return reportData[selectedReport as keyof typeof reportData];
  };

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reports</h1>
            <p className="text-muted-foreground mt-1">
              Generate and download business reports
            </p>
          </div>
          <div className="flex space-x-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
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
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-foreground">
                  {formatCurrency(quickStats.totalRevenue)}
                </div>
                <div className="text-sm text-muted-foreground">Total Revenue</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <Package className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-foreground">
                  {quickStats.totalOrders.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Total Orders</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-foreground">
                  {quickStats.totalCustomers}
                </div>
                <div className="text-sm text-muted-foreground">Total Customers</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <TrendingUp className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-foreground">
                  {formatCurrency(quickStats.averageOrderValue)}
                </div>
                <div className="text-sm text-muted-foreground">Avg Order Value</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <BarChart3 className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-foreground">
                  {quickStats.topProduct}
                </div>
                <div className="text-sm text-muted-foreground">Top Product</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <Calendar className="w-8 h-8 text-pink-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-foreground">
                  {quickStats.bestMonth}
                </div>
                <div className="text-sm text-muted-foreground">Best Month</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Selection */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Object.entries(reportData).map(([key, report]) => (
            <Card 
              key={key}
              className={`cursor-pointer transition-colors ${
                selectedReport === key ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
              }`}
              onClick={() => setSelectedReport(key)}
            >
              <CardContent className="p-4">
                <div className="text-center">
                  <FileText className="w-8 h-8 text-primary mx-auto mb-2" />
                  <div className="font-medium text-foreground">{report.title}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {report.description}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Report Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Report */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>{getCurrentReportData().title}</CardTitle>
                    <CardDescription>{getCurrentReportData().description}</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    {exportOptions.map((option) => (
                      <Button
                        key={option.format}
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport(option.format)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedReport === 'sales' && (
                    <div className="space-y-3">
                      {getCurrentReportData().data.map((item: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{item.period}</div>
                            <div className="text-sm text-muted-foreground">
                              Growth: +{item.change}%
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{formatCurrency(item.value)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedReport === 'inventory' && (
                    <div className="space-y-3">
                      {getCurrentReportData().data.map((item: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{item.category}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.stock} units in stock
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{formatCurrency(item.value)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedReport === 'customers' && (
                    <div className="space-y-3">
                      {getCurrentReportData().data.map((item: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{item.segment}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.count} customers
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{formatCurrency(item.revenue)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedReport === 'financial' && (
                    <div className="space-y-3">
                      {getCurrentReportData().data.map((item: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{item.metric}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.percentage}% of revenue
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{formatCurrency(item.amount)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Report Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Report Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-foreground mb-1">
                    {selectedReport === 'sales' ? formatCurrency(450000) :
                     selectedReport === 'inventory' ? '3,120 units' :
                     selectedReport === 'customers' ? '205 customers' :
                     formatCurrency(600000)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedReport === 'sales' ? 'This Month Revenue' :
                     selectedReport === 'inventory' ? 'Total Stock' :
                     selectedReport === 'customers' ? 'Active Customers' :
                     'Net Profit'}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Period:</span>
                    <span className="font-medium">
                      {selectedPeriod === '7days' ? 'Last 7 days' :
                       selectedPeriod === '30days' ? 'Last 30 days' :
                       selectedPeriod === '90days' ? 'Last 90 days' :
                       'Last year'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Generated:</span>
                    <span className="font-medium">{formatDate(new Date())}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="font-medium text-green-600">Up to date</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Report
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download All Reports
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  Custom Report
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Report History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Sales Report - June</span>
                    <Button variant="ghost" size="sm">
                      <Download className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex justify-between">
                    <span>Inventory Report - May</span>
                    <Button variant="ghost" size="sm">
                      <Download className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex justify-between">
                    <span>Financial Report - Q1</span>
                    <Button variant="ghost" size="sm">
                      <Download className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  );
};

export default VendorReports;