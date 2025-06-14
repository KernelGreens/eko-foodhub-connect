'use client'

import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Phone, 
  Mail, 
  MapPin,
  ShoppingCart,
  Calendar,
  Star,
  MoreHorizontal,
  Eye,
  MessageCircle
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../../components/ui/dropdown-menu';
import { formatCurrency, formatDate } from '../../../utils/format';
interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: Date;
  customerSince: Date;
  status: 'active' | 'inactive';
  segment: 'vip' | 'regular' | 'new';
  rating: number;
}

const VendorCustomers: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerDetailOpen, setIsCustomerDetailOpen] = useState(false);

  // Mock customer data
  const customers: Customer[] = [
    {
      id: 'CUST-001',
      name: 'Kemi Oladele',
      email: 'kemi.oladele@email.com',
      phone: '+234-802-345-6789',
      location: 'Ikeja, Lagos',
      totalOrders: 45,
      totalSpent: 125000,
      lastOrderDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      customerSince: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      status: 'active',
      segment: 'vip',
      rating: 4.8
    },
    {
      id: 'CUST-002',
      name: 'John Adebayo',
      email: 'john.adebayo@email.com',
      phone: '+234-803-456-7890',
      location: 'Victoria Island, Lagos',
      totalOrders: 28,
      totalSpent: 85000,
      lastOrderDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      customerSince: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
      status: 'active',
      segment: 'regular',
      rating: 4.5
    },
    {
      id: 'CUST-003',
      name: 'Sarah Ibrahim',
      email: 'sarah.ibrahim@email.com',
      phone: '+234-804-567-8901',
      location: 'Surulere, Lagos',
      totalOrders: 12,
      totalSpent: 35000,
      lastOrderDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      customerSince: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      status: 'active',
      segment: 'regular',
      rating: 4.2
    },
    {
      id: 'CUST-004',
      name: 'Ahmed Hassan',
      email: 'ahmed.hassan@email.com',
      phone: '+234-805-678-9012',
      location: 'Mushin, Lagos',
      totalOrders: 3,
      totalSpent: 8500,
      lastOrderDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      customerSince: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      status: 'active',
      segment: 'new',
      rating: 4.0
    },
    {
      id: 'CUST-005',
      name: 'Funmi Adeyemi',
      email: 'funmi.adeyemi@email.com',
      phone: '+234-806-789-0123',
      location: 'Lekki, Lagos',
      totalOrders: 67,
      totalSpent: 195000,
      lastOrderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      customerSince: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      status: 'active',
      segment: 'vip',
      rating: 4.9
    }
  ];

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         customer.phone.includes(searchQuery);
    const matchesSegment = selectedSegment === 'all' || customer.segment === selectedSegment;
    const matchesStatus = selectedStatus === 'all' || customer.status === selectedStatus;
    
    return matchesSearch && matchesSegment && matchesStatus;
  });

  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case 'vip': return 'bg-purple-100 text-purple-800 hover:bg-purple-100';
      case 'regular': return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      case 'new': return 'bg-green-100 text-green-800 hover:bg-green-100';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  const openCustomerDetail = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsCustomerDetailOpen(true);
  };

  const customerStats = {
    total: customers.length,
    vip: customers.filter(c => c.segment === 'vip').length,
    regular: customers.filter(c => c.segment === 'regular').length,
    new: customers.filter(c => c.segment === 'new').length,
    active: customers.filter(c => c.status === 'active').length,
  };

  // Mock recent orders for customer detail
  const getCustomerOrders = (customerId: string) => [
    {
      id: 'ORD-001',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      total: 15000,
      status: 'delivered',
      items: ['Fresh Tomatoes', 'White Rice']
    },
    {
      id: 'ORD-002',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      total: 8500,
      status: 'delivered',
      items: ['Sweet Plantains', 'Fresh Pepper']
    }
  ];

  return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Customers</h1>
          <p className="text-muted-foreground mt-1">
            Manage your customer relationships and insights
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{customerStats.total}</div>
                <div className="text-sm text-muted-foreground">Total Customers</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{customerStats.vip}</div>
                <div className="text-sm text-muted-foreground">VIP Customers</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{customerStats.regular}</div>
                <div className="text-sm text-muted-foreground">Regular</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{customerStats.new}</div>
                <div className="text-sm text-muted-foreground">New Customers</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{customerStats.active}</div>
                <div className="text-sm text-muted-foreground">Active</div>
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
                    placeholder="Search customers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedSegment} onValueChange={setSelectedSegment}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Segments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Segments</SelectItem>
                  <SelectItem value="vip">VIP Customers</SelectItem>
                  <SelectItem value="regular">Regular Customers</SelectItem>
                  <SelectItem value="new">New Customers</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Customers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Database</CardTitle>
            <CardDescription>
              {filteredCustomers.length} customers found
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No customers found</h3>
                <p className="text-muted-foreground">
                  No customers match your current filters
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Orders
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Total Spent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Segment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Last Order
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-background divide-y divide-border">
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-muted/30">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                              <Users className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-foreground">
                                {customer.name}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center">
                                <MapPin className="w-3 h-3 mr-1" />
                                {customer.location}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <div className="flex items-center text-foreground">
                              <Mail className="w-3 h-3 mr-1" />
                              {customer.email}
                            </div>
                            <div className="flex items-center text-muted-foreground mt-1">
                              <Phone className="w-3 h-3 mr-1" />
                              {customer.phone}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-foreground">
                            {customer.totalOrders}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            orders
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-foreground">
                            {formatCurrency(customer.totalSpent)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            lifetime value
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getSegmentColor(customer.segment)}>
                            {customer.segment.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {formatDate(customer.lastOrderDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => openCustomerDetail(customer)}
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
                                <DropdownMenuItem>
                                  <MessageCircle className="w-4 h-4 mr-2" />
                                  Send Message
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Phone className="w-4 h-4 mr-2" />
                                  Call Customer
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <ShoppingCart className="w-4 h-4 mr-2" />
                                  View Orders
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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

        {/* Customer Detail Dialog */}
        <Dialog open={isCustomerDetailOpen} onOpenChange={setIsCustomerDetailOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Customer Details - {selectedCustomer?.name}</DialogTitle>
              <DialogDescription>
                Complete customer information and order history
              </DialogDescription>
            </DialogHeader>
            
            {selectedCustomer && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Customer Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Customer ID:</span>
                        <span className="font-medium">{selectedCustomer.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span>{selectedCustomer.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone:</span>
                        <span>{selectedCustomer.phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Location:</span>
                        <span>{selectedCustomer.location}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Customer Since:</span>
                        <span>{formatDate(selectedCustomer.customerSince)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rating:</span>
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="ml-1">{selectedCustomer.rating}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Customer Stats */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Customer Statistics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Orders:</span>
                        <span className="font-medium">{selectedCustomer.totalOrders}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Spent:</span>
                        <span className="font-medium">{formatCurrency(selectedCustomer.totalSpent)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Average Order:</span>
                        <span>{formatCurrency(selectedCustomer.totalSpent / selectedCustomer.totalOrders)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Order:</span>
                        <span>{formatDate(selectedCustomer.lastOrderDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Segment:</span>
                        <Badge className={getSegmentColor(selectedCustomer.segment)}>
                          {selectedCustomer.segment.toUpperCase()}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Orders */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Orders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {getCustomerOrders(selectedCustomer.id).map((order, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <ShoppingCart className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{order.id}</p>
                              <p className="text-sm text-muted-foreground">
                                {order.items.join(', ')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(order.total)}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(order.date)}
                            </p>
                          </div>
                        </div>
                      ))}
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

export default VendorCustomers;