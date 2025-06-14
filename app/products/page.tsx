'use client'

import React, { useEffect, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useProductStore } from '../../stores/productStore';
import ProductGrid from '../../components/products/productGrid';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { Select, SelectContent, 
        SelectItem, SelectTrigger, 
        SelectValue } from '../../components/ui/select';

const Products: React.FC = () => {
  const {
    filteredProducts,
    categories,
    isLoading,
    searchQuery,
    selectedCategory,
    fetchProducts,
    searchProducts,
    filterByCategory,
  } = useProductStore();

  const [showFilters, setShowFilters] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchProducts(localSearchQuery);
  };

  const handleCategoryFilter = (category: typeof selectedCategory) => {
    filterByCategory(category);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-4">Fresh Products</h1>
        <p className="text-muted-foreground text-lg">
          Discover fresh, quality produce from verified vendors across Lagos State
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Search for products, vendors, or categories..."
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit">
            Search
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
          </Button>
        </form>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleCategoryFilter('all')}
          >
            All Categories
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleCategoryFilter(category)}
              className="capitalize"
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    Price Range
                  </label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      placeholder="Min"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="number"
                      placeholder="Max"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    Hub Location
                  </label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="All Locations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      <SelectItem value="idi-oro">Idi-Oro, Mushin</SelectItem>
                      <SelectItem value="ajah">Ajah</SelectItem>
                      <SelectItem value="agege">Agege</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    Freshness
                  </label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="very-fresh">Very Fresh</SelectItem>
                      <SelectItem value="fresh">Fresh</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <Button variant="ghost">Clear Filters</Button>
                <Button>Apply Filters</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Results */}
      <div className="mb-6 flex justify-between items-center">
        <p className="text-muted-foreground">
          {isLoading ? 'Loading...' : `${filteredProducts.length} products found`}
        </p>
        <Select>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
            <SelectItem value="rating">Highest Rated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Product Grid */}
      <ProductGrid 
        products={filteredProducts} 
        isLoading={isLoading}
        onAddToCart={(product) => {
          console.log('Add to cart:', product);
          // TODO: Implement cart functionality
        }}
      />
    </div>
  );
};

export default Products;