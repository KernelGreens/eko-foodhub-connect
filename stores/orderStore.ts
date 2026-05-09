import { create } from 'zustand';
import { Order, OrderStatus, PaymentStatus, PaymentMethod, Address } from '../types';
import { CartItem } from './cartStore';
import { allowDevelopmentFallbacks } from '../lib/runtime/fallback-policy';
import { mockOrders } from '../lib/orders/mock-orders';
import { cancelFrontendOrder, isFrontendOrderCancelable } from '../lib/orders/order-view-model';

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
  fetchOrders: () => Promise<void>;
  fetchOrderById: (orderId: string) => Promise<Order | null>;
  cancelOrder: (orderId: string) => Promise<void>;
}

function calculateDeliveryFee(deliveryAddress: Address) {
  void deliveryAddress;
  return 500;
}

function hydrateOrderDates(order: Order): Order {
  return {
    ...order,
    createdAt: new Date(order.createdAt),
    updatedAt: new Date(order.updatedAt),
    cancelledAt: order.cancelledAt ? new Date(order.cancelledAt) : undefined,
    deliveryDate: order.deliveryDate ? new Date(order.deliveryDate) : undefined,
    deliveryException: order.deliveryException
      ? {
          ...order.deliveryException,
          reportedAt: new Date(order.deliveryException.reportedAt),
        }
      : undefined,
    statusHistory: order.statusHistory?.map((event) => ({
      ...event,
      createdAt: new Date(event.createdAt),
    })),
  };
}

function mergeOrders(primary: Order[], secondary: Order[]) {
  const byId = new Map<string, Order>();

  primary.forEach((order) => {
    byId.set(order.id, order);
  });

  secondary.forEach((order) => {
    if (!byId.has(order.id)) {
      byId.set(order.id, order);
    }
  });

  return Array.from(byId.values()).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  currentOrder: null,
  isLoading: false,
  setCurrentOrder: (order: Order) => {
    const hydratedOrder = hydrateOrderDates(order);
    const { orders } = get();
    const existingOrder = orders.find((candidate) => candidate.id === hydratedOrder.id);

    set({
      currentOrder: hydratedOrder,
      orders: existingOrder
        ? orders.map((candidate) => (candidate.id === hydratedOrder.id ? hydratedOrder : candidate))
        : [hydratedOrder, ...orders],
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
      const response = await fetch('/api/buyer/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
          deliveryAddress,
          paymentMethod,
          notes,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error?.message ?? 'Failed to create order.');
      }

      const persistedOrder = hydrateOrderDates(payload.data as Order);
      const { orders } = get();

      set({
        orders: [persistedOrder, ...orders],
        currentOrder: persistedOrder,
        isLoading: false,
      });

      return persistedOrder.id;
    } catch (error) {
      if (!allowDevelopmentFallbacks()) {
        set({ isLoading: false });
        throw error;
      }

      console.error('Falling back to local mock order creation.', error);

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

    try {
      const response = await fetch('/api/buyer/orders');

      if (!response.ok) {
        if (response.status === 401) {
          set({
            orders: [],
            isLoading: false,
          });
          return;
        }
        throw new Error(`Failed to fetch orders: ${response.status}`);
      }

      const payload = await response.json();
      const fetchedOrders = Array.isArray(payload?.data)
        ? payload.data.map((order: Order) => hydrateOrderDates(order))
        : [];

      const { orders } = get();

      set({
        orders: mergeOrders(fetchedOrders, orders),
        isLoading: false,
      });
    } catch (error) {
      if (!allowDevelopmentFallbacks()) {
        console.error('Failed to fetch orders. Mock fallback is disabled.', error);

        set({
          orders: get().orders,
          isLoading: false,
        });
        return;
      }

      console.error('Falling back to mock orders.', error);
      const { orders } = get();

      set({
        orders: mergeOrders(
          mockOrders.map((candidate) => hydrateOrderDates(candidate)),
          orders,
        ),
        isLoading: false,
      });
    }
  },

  fetchOrderById: async (orderId: string) => {
    const { orders } = get();
    const order = orders.find(o => o.id === orderId);

    if (order) {
      set({ currentOrder: order });
    }

    try {
      const response = await fetch(`/api/buyer/orders/${orderId}`);

      if (!response.ok) {
        if (response.status === 401) {
          return null;
        }
        if (order) {
          return order;
        }
        return null;
      }

      const payload = await response.json();
      const fetchedOrder = payload?.data ? hydrateOrderDates(payload.data as Order) : null;

      if (!fetchedOrder) {
        return order ?? null;
      }

      get().setCurrentOrder(fetchedOrder);
      return fetchedOrder;
    } catch (error) {
      console.error('Failed to fetch order detail.', error);
      return order ?? null;
    }
  },

  cancelOrder: async (orderId: string) => {
    const existingOrder = get().orders.find((order) => order.id === orderId);

    try {
      const response = await fetch(`/api/buyer/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error?.message ?? 'Failed to cancel order.');
      }

      get().setCurrentOrder(payload.data as Order);
    } catch (error) {
      if (
        allowDevelopmentFallbacks() &&
        existingOrder &&
        isFrontendOrderCancelable(existingOrder.status)
      ) {
        get().setCurrentOrder(cancelFrontendOrder(existingOrder));
        return;
      }

      throw error;
    }
  },
}));
