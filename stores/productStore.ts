import { create } from 'zustand';
import { Product, ProductCategory } from '../types';

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

// Mock products data
const mockProducts: Product[] = [
  {
    id: '1',
    vendorId: '1',
    name: 'Fresh Tomatoes',
    category: 'vegetables',
    description: 'Premium quality Roma tomatoes, freshly harvested from our organic farm in Ogun State.',
    images: ['https://images.pexels.com/photos/533280/pexels-photo-533280.jpeg'],
    price: 800,
    unit: 'kg',
    stock: 500,
    minOrder: 5,
    maxOrder: 100,
    bulkPricing: [
      { minQuantity: 20, price: 750, discount: 6.25 },
      { minQuantity: 50, price: 700, discount: 12.5 },
    ],
    freshness: 'very-fresh',
    harvestDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    isOrganic: true,
    isAvailable: true,
    tags: ['organic', 'local', 'fresh'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    vendorId: '1',
    name: 'Sweet Plantains',
    category: 'fruits',
    description: 'Ripe, sweet plantains perfect for frying or boiling. Sourced from local farms.',
    images: ['https://images.pexels.com/photos/5966630/pexels-photo-5966630.jpeg'],
    price: 300,
    unit: 'piece',
    stock: 200,
    minOrder: 10,
    bulkPricing: [
      { minQuantity: 50, price: 280, discount: 6.67 },
    ],
    freshness: 'fresh',
    isOrganic: false,
    isAvailable: true,
    tags: ['sweet', 'ripe', 'local'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    vendorId: '1',
    name: 'White Rice (Local)',
    category: 'grains',
    description: 'Premium quality local white rice, stone-free and well processed.',
    images: ['https://images.pexels.com/photos/723198/pexels-photo-723198.jpeg'],
    price: 1200,
    unit: 'kg',
    stock: 1000,
    minOrder: 25,
    bulkPricing: [
      { minQuantity: 50, price: 1150, discount: 4.17 },
      { minQuantity: 100, price: 1100, discount: 8.33 },
    ],
    freshness: 'fresh',
    isOrganic: false,
    isAvailable: true,
    tags: ['local', 'stone-free', 'quality'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

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
    
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    set({ 
      products: mockProducts,
      filteredProducts: mockProducts,
      isLoading: false 
    });
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