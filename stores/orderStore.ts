import { create } from 'zustand';
import { Order, OrderStatus, PaymentStatus, PaymentMethod, Address } from '../types';
import { CartItem } from './cartStore';

interface OrderState {
  orders: Order[];
  currentOrder: Order | null;
  isLoading: boolean;
  setCurrentOrder: (order: Order) => void;
  createOrder: (
    items: CartItem[],
    deliveryAddress: Address,
    paymentMethod: PaymentMethod,
    notes?: string
  ) => Promise<string>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  updatePaymentStatus: (orderId: string, status: PaymentStatus) => Promise<void>;
  fetchOrders: (userId?: string) => Promise<void>;
  fetchOrderById: (orderId: string) => Promise<Order | null>;
  cancelOrder: (orderId: string) => Promise<void>;
}

// Mock delivery fee calculation
const calculateDeliveryFee = (address: Address): number => {
  // Simple delivery fee based on LGA
  const deliveryFees: Record<string, number> = {
    'mushin': 500,
    'lagos-island': 800,
    'ikeja': 600,
    'surulere': 550,
    'alimosho': 700,
    'kosofe': 650,
    'oshodi-isolo': 600,
    'agege': 750,
    'ifako-ijaiye': 700,
    'shomolu': 600,
  };
  
  const lga = address.lga.toLowerCase().replace(/\s+/g, '-');
  return deliveryFees[lga] || 1000; // Default fee for other areas
};

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  currentOrder: null,
  isLoading: false,
  setCurrentOrder: (order: Order) => {
    const { orders } = get();
    const existingOrder = orders.find((candidate) => candidate.id === order.id);

    set({
      currentOrder: order,
      orders: existingOrder
        ? orders.map((candidate) => (candidate.id === order.id ? order : candidate))
        : [order, ...orders],
    });
  },

  createOrder: async (
    items: CartItem[],
    deliveryAddress: Address,
    paymentMethod: PaymentMethod,
    notes?: string
  ) => {
    set({ isLoading: true });

    try {
      // Calculate totals
      const itemsTotal = items.reduce((total, item) => {
        const price = item.selectedBulkPricing?.price || item.product.price;
        return total + (price * item.quantity);
      }, 0);

      const deliveryFee = calculateDeliveryFee(deliveryAddress);
      const totalAmount = itemsTotal + deliveryFee;

      // Create order
      const newOrder: Order = {
        id: `ORD-${Date.now()}`,
        buyerId: 'current-user-id', // This would come from auth store
        vendorId: items[0].product.vendorId, // For now, assume single vendor
        items: items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.selectedBulkPricing?.price || item.product.price,
          totalPrice: (item.selectedBulkPricing?.price || item.product.price) * item.quantity,
        })),
        totalAmount,
        status: 'pending',
        paymentStatus: paymentMethod === 'cash-on-delivery' ? 'pending' : 'processing',
        paymentMethod,
        deliveryAddress,
        deliveryFee,
        notes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { orders } = get();
      set({ 
        orders: [newOrder, ...orders],
        currentOrder: newOrder,
        isLoading: false 
      });

      return newOrder.id;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateOrderStatus: async (orderId: string, status: OrderStatus) => {
    const { orders } = get();
    const updatedOrders = orders.map(order =>
      order.id === orderId
        ? { ...order, status, updatedAt: new Date() }
        : order
    );
    set({ orders: updatedOrders });
  },

  updatePaymentStatus: async (orderId: string, status: PaymentStatus) => {
    const { orders } = get();
    const updatedOrders = orders.map(order =>
      order.id === orderId
        ? { ...order, paymentStatus: status, updatedAt: new Date() }
        : order
    );
    set({ orders: updatedOrders });
  },

  fetchOrders: async () => {
    set({ isLoading: true });
    
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock orders data
    const mockOrders: Order[] = [
      {
        id: 'ORD-1703123456789',
        buyerId: 'current-user-id',
        vendorId: '1',
        items: [
          {
            productId: '1',
            quantity: 10,
            unitPrice: 800,
            totalPrice: 8000,
          }
        ],
        totalAmount: 8500,
        status: 'delivered',
        paymentStatus: 'completed',
        paymentMethod: 'momo',
        deliveryAddress: {
          street: '123 Main Street',
          area: 'Ikeja',
          lga: 'Ikeja',
          state: 'Lagos',
          landmark: 'Near Computer Village',
        },
        deliveryFee: 500,
        deliveryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      }
    ];

    set({ orders: mockOrders, isLoading: false });
  },

  fetchOrderById: async (orderId: string) => {
    const { orders } = get();
    const order = orders.find(o => o.id === orderId);
    
    if (order) {
      set({ currentOrder: order });
      return order;
    }
    
    return null;
  },

  cancelOrder: async (orderId: string) => {
    await get().updateOrderStatus(orderId, 'cancelled');
  },
}));
