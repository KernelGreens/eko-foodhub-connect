'use client'

import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, Edit, Trash2, Eye, Package, Upload, Save, X } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { useProductStore } from '../../../stores/productStore';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { formatCurrency } from '../../../utils/format';
// import VendorLayout from '../../../components/Vendor/Layout';
import { Product, ProductCategory } from '../../../types';

const VendorProducts: React.FC = () => {
  const { vendor } = useAuthStore();
  const { products, fetchProducts, addProduct, updateProduct, deleteProduct } = useProductStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'vegetables' as ProductCategory,
    description: '',
    price: '',
    unit: 'kg',
    stock: '',
    minOrder: '',
    maxOrder: '',
    isOrganic: false,
    freshness: 'fresh' as const,
    tags: '',
  });

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const vendorProducts = products.filter(p => p.vendorId === vendor?.id);

  const filteredProducts = vendorProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || 
                         (selectedStatus === 'active' && product.isAvailable) ||
                         (selectedStatus === 'inactive' && !product.isAvailable) ||
                         (selectedStatus === 'low-stock' && product.stock < 10);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = ['vegetables', 'fruits', 'grains', 'tubers', 'meat', 'fish', 'dairy', 'spices', 'herbs', 'processed'];

  const getStockStatus = (product: Product) => {
    if (product.stock === 0) return { label: 'Out of Stock', variant: 'destructive' as const };
    if (product.stock < 10) return { label: 'Low Stock', variant: 'destructive' as const };
    return { label: 'In Stock', variant: 'default' as const };
  };

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'vegetables',
      description: '',
      price: '',
      unit: 'kg',
      stock: '',
      minOrder: '',
      maxOrder: '',
      isOrganic: false,
      freshness: 'fresh',
      tags: '',
    });
  };

  const handleAddProduct = async () => {
    if (!vendor) return;

    const productData = {
      vendorId: vendor.id,
      name: formData.name,
      category: formData.category,
      description: formData.description,
      images: ['https://images.pexels.com/photos/1300972/pexels-photo-1300972.jpeg'], // Default image
      price: parseFloat(formData.price),
      unit: formData.unit,
      stock: parseInt(formData.stock),
      minOrder: parseInt(formData.minOrder),
      maxOrder: formData.maxOrder ? parseInt(formData.maxOrder) : undefined,
      freshness: formData.freshness,
      isOrganic: formData.isOrganic,
      isAvailable: true,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
    };

    await addProduct(productData);
    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleEditProduct = async () => {
    if (!editingProduct) return;

    const updates = {
      name: formData.name,
      category: formData.category,
      description: formData.description,
      price: parseFloat(formData.price),
      unit: formData.unit,
      stock: parseInt(formData.stock),
      minOrder: parseInt(formData.minOrder),
      maxOrder: formData.maxOrder ? parseInt(formData.maxOrder) : undefined,
      freshness: formData.freshness,
      isOrganic: formData.isOrganic,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
    };

    await updateProduct(editingProduct.id, updates);
    setIsEditDialogOpen(false);
    setEditingProduct(null);
    resetForm();
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      description: product.description,
      price: product.price.toString(),
      unit: product.unit,
      stock: product.stock.toString(),
      minOrder: product.minOrder.toString(),
      maxOrder: product.maxOrder?.toString() || '',
      isOrganic: product.isOrganic,
      freshness: product.freshness,
      tags: product.tags.join(', '),
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await deleteProduct(productId);
    }
  };

  const ProductForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Product Name</label>
          <Input
            value={formData.name}
            onChange={(e) => handleFormChange('name', e.target.value)}
            placeholder="Enter product name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Category</label>
          <Select value={formData.category} onValueChange={(value) => handleFormChange('category', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category} value={category} className="capitalize">
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Description</label>
        <textarea
          className="w-full p-3 border rounded-md resize-none"
          rows={3}
          value={formData.description}
          onChange={(e) => handleFormChange('description', e.target.value)}
          placeholder="Describe your product..."
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Price</label>
          <Input
            type="number"
            value={formData.price}
            onChange={(e) => handleFormChange('price', e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Unit</label>
          <Select value={formData.unit} onValueChange={(value) => handleFormChange('unit', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kg">Kilogram (kg)</SelectItem>
              <SelectItem value="g">Gram (g)</SelectItem>
              <SelectItem value="piece">Piece</SelectItem>
              <SelectItem value="bunch">Bunch</SelectItem>
              <SelectItem value="bag">Bag</SelectItem>
              <SelectItem value="carton">Carton</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Stock</label>
          <Input
            type="number"
            value={formData.stock}
            onChange={(e) => handleFormChange('stock', e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Minimum Order</label>
          <Input
            type="number"
            value={formData.minOrder}
            onChange={(e) => handleFormChange('minOrder', e.target.value)}
            placeholder="1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Maximum Order (Optional)</label>
          <Input
            type="number"
            value={formData.maxOrder}
            onChange={(e) => handleFormChange('maxOrder', e.target.value)}
            placeholder="No limit"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Freshness</label>
          <Select value={formData.freshness} onValueChange={(value) => handleFormChange('freshness', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fresh">Fresh</SelectItem>
              <SelectItem value="very-fresh">Very Fresh</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2 pt-6">
          <input
            type="checkbox"
            id="isOrganic"
            checked={formData.isOrganic}
            onChange={(e) => handleFormChange('isOrganic', e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="isOrganic" className="text-sm font-medium">
            Organic Product
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Tags (comma separated)</label>
        <Input
          value={formData.tags}
          onChange={(e) => handleFormChange('tags', e.target.value)}
          placeholder="fresh, local, organic"
        />
      </div>
    </div>
  );

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Products</h1>
            <p className="text-muted-foreground mt-1">
              Manage your product inventory and pricing
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Add Product</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
                <DialogDescription>
                  Add a new product to your inventory
                </DialogDescription>
              </DialogHeader>
              <ProductForm />
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddProduct}>
                  <Save className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category} className="capitalize">
                      {category}
                    </SelectItem>
                  ))}
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
                  <SelectItem value="low-stock">Low Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Product Inventory</CardTitle>
                <CardDescription>
                  {filteredProducts.length} of {vendorProducts.length} products
                </CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {vendorProducts.length === 0 ? 'No products yet' : 'No products found'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {vendorProducts.length === 0 
                    ? 'Start by adding your first product to the marketplace'
                    : 'Try adjusting your search or filter criteria'
                  }
                </p>
                {vendorProducts.length === 0 && (
                  <Button onClick={() => setIsAddDialogOpen(true)}>Add Your First Product</Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-background divide-y divide-border">
                    {filteredProducts.map((product) => {
                      const stockStatus = getStockStatus(product);
                      return (
                        <tr key={product.id} className="hover:bg-muted/30">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-12 h-12 rounded-lg object-cover mr-3"
                              />
                              <div>
                                <div className="text-sm font-medium text-foreground">
                                  {product.name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Min order: {product.minOrder} {product.unit}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="secondary" className="capitalize">
                              {product.category}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            <div>
                              <div className="font-medium">{formatCurrency(product.price)}</div>
                              <div className="text-muted-foreground">per {product.unit}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            <div>
                              <div className="font-medium">{product.stock} {product.unit}</div>
                              <Badge variant={stockStatus.variant} className="text-xs">
                                {stockStatus.label}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge 
                              variant={product.isAvailable ? "default" : "destructive"}
                              className={product.isAvailable ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
                            >
                              {product.isAvailable ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="icon">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(product)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(product.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
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

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>
                Update product information
              </DialogDescription>
            </DialogHeader>
            <ProductForm isEdit />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditProduct}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
  );
};

export default VendorProducts;