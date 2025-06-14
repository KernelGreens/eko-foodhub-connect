export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'buyer' | 'vendor' | 'admin';
  avatar?: string;
  createdAt: Date;
  isVerified: boolean;
}

export interface Vendor extends User {
  businessName: string;
  businessAddress: string;
  hubLocation: 'idi-oro' | 'ajah' | 'agege' | 'abule-ado';
  vendorId: string;
  businessLicense?: string;
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
  };
  rating: number;
  totalSales: number;
  isActive: boolean;
}

export interface Product {
  id: string;
  vendorId: string;
  name: string;
  category: ProductCategory;
  description: string;
  images: string[];
  price: number;
  unit: string;
  stock: number;
  minOrder: number;
  maxOrder?: number;
  bulkPricing?: BulkPricing[];
  freshness: 'fresh' | 'very-fresh' | 'premium';
  harvestDate?: Date;
  expiryDate?: Date;
  isOrganic: boolean;
  isAvailable: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BulkPricing {
  minQuantity: number;
  price: number;
  discount: number;
}

export type ProductCategory = 
  | 'fruits'
  | 'vegetables'
  | 'grains'
  | 'tubers'
  | 'meat'
  | 'fish'
  | 'dairy'
  | 'spices'
  | 'herbs'
  | 'processed';

export interface Order {
  id: string;
  buyerId: string;
  vendorId: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  deliveryAddress: Address;
  deliveryDate?: Date;
  deliveryFee: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'in-transit'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded';

export type PaymentMethod = 
  | 'momo'
  | 'bank-transfer'
  | 'card'
  | 'ussd'
  | 'cash-on-delivery';

export interface Address {
  street: string;
  area: string;
  lga: string;
  state: string;
  landmark?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface Hub {
  id: string;
  name: string;
  location: string;
  address: string;
  capacity: number;
  activeVendors: number;
  facilities: string[];
  operatingHours: {
    open: string;
    close: string;
  };
  contactInfo: {
    phone: string;
    email: string;
  };
}