import { create } from 'zustand';
import { Product, ProductCategory } from '../types';
import { allowDevelopmentFallbacks } from '../lib/runtime/fallback-policy';
import { mockProducts } from '../lib/catalog/mock-products';

interface ProductState {
  products: Product[];
  filteredProducts: Product[];
  categories: ProductCategory[];
  isLoading: boolean;
  searchQuery: string;
  selectedCategory: ProductCategory | 'all';
  selectedHub: string;
  priceRange: [number, number];
  fetchProducts: () => Promise<void>;
  searchProducts: (query: string) => void;
  filterByCategory: (category: ProductCategory | 'all') => void;
  filterByHub: (hub: string) => void;
  filterByPrice: (range: [number, number]) => void;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
}

function hydrateProductDates(product: Product): Product {
  return {
    ...product,
    createdAt: new Date(product.createdAt),
    updatedAt: new Date(product.updatedAt),
    harvestDate: product.harvestDate ? new Date(product.harvestDate) : undefined,
    expiryDate: product.expiryDate ? new Date(product.expiryDate) : undefined,
  };
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  filteredProducts: [],
  categories: ['fruits', 'vegetables', 'grains', 'tubers', 'meat', 'fish', 'dairy', 'spices', 'herbs', 'processed'],
  isLoading: false,
  searchQuery: '',
  selectedCategory: 'all',
  selectedHub: 'all',
  priceRange: [0, 5000],

  fetchProducts: async () => {
    set({ isLoading: true });

    try {
      const response = await fetch('/api/public/products', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`);
      }

      const payload = await response.json();
      const products = Array.isArray(payload?.data)
        ? payload.data.map((product: Product) => hydrateProductDates(product))
        : [];

      set({
        products,
        filteredProducts: products,
        isLoading: false,
      });
    } catch (error) {
      if (allowDevelopmentFallbacks()) {
        console.error('Falling back to mock products.', error);

        set({
          products: mockProducts,
          filteredProducts: mockProducts,
          isLoading: false,
        });
        return;
      }

      console.error('Failed to fetch products. Mock fallback is disabled.', error);

      set({
        products: [],
        filteredProducts: [],
        isLoading: false,
      });
    }
  },

  searchProducts: (query: string) => {
    set({ searchQuery: query });
    const { products } = get();
    
    if (!query.trim()) {
      set({ filteredProducts: products });
      return;
    }
    
    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(query.toLowerCase()) ||
      product.description.toLowerCase().includes(query.toLowerCase()) ||
      product.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    );
    
    set({ filteredProducts: filtered });
  },

  filterByCategory: (category: ProductCategory | 'all') => {
    set({ selectedCategory: category });
    const { products } = get();
    
    if (category === 'all') {
      set({ filteredProducts: products });
      return;
    }
    
    const filtered = products.filter(product => product.category === category);
    set({ filteredProducts: filtered });
  },

  filterByHub: (hub: string) => {
    set({ selectedHub: hub });
    // Implementation would filter by vendor's hub location
  },

  filterByPrice: (range: [number, number]) => {
    set({ priceRange: range });
    const { products } = get();
    
    const filtered = products.filter(product => 
      product.price >= range[0] && product.price <= range[1]
    );
    
    set({ filteredProducts: filtered });
  },

  addProduct: async (productData) => {
    const newProduct: Product = {
      ...productData,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const { products } = get();
    const updatedProducts = [...products, newProduct];
    
    set({ 
      products: updatedProducts,
      filteredProducts: updatedProducts 
    });
  },

  updateProduct: async (id: string, updates: Partial<Product>) => {
    const { products } = get();
    const updatedProducts = products.map(product =>
      product.id === id 
        ? { ...product, ...updates, updatedAt: new Date() }
        : product
    );
    
    set({ 
      products: updatedProducts,
      filteredProducts: updatedProducts 
    });
  },

  deleteProduct: async (id: string) => {
    const { products } = get();
    const updatedProducts = products.filter(product => product.id !== id);
    
    set({ 
      products: updatedProducts,
      filteredProducts: updatedProducts 
    });
  },
}));
