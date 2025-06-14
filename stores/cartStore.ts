import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '../types/index';

export interface CartItem {
  product: Product;
  quantity: number;
  selectedBulkPricing?: {
    minQuantity: number;
    price: number;
    discount: number;
  };
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (product: Product, quantity: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getItemPrice: (item: CartItem) => number;
  validateMinimumOrders: () => { isValid: boolean; errors: string[] };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product: Product, quantity: number) => {
        const { items } = get();
        const existingItemIndex = items.findIndex(item => item.product.id === product.id);

        if (existingItemIndex >= 0) {
          // Update existing item
          const updatedItems = [...items];
          const newQuantity = updatedItems[existingItemIndex].quantity + quantity;
          
          // Check if bulk pricing applies
          const bulkPricing = product.bulkPricing?.find(
            bp => newQuantity >= bp.minQuantity
          );
          
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            quantity: newQuantity,
            selectedBulkPricing: bulkPricing
          };
          
          set({ items: updatedItems });
        } else {
          // Add new item
          const bulkPricing = product.bulkPricing?.find(
            bp => quantity >= bp.minQuantity
          );
          
          const newItem: CartItem = {
            product,
            quantity,
            selectedBulkPricing: bulkPricing
          };
          
          set({ items: [...items, newItem] });
        }
      },

      removeItem: (productId: string) => {
        const { items } = get();
        set({ items: items.filter(item => item.product.id !== productId) });
      },

      updateQuantity: (productId: string, quantity: number) => {
        const { items } = get();
        
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        const updatedItems = items.map(item => {
          if (item.product.id === productId) {
            // Check if bulk pricing applies
            const bulkPricing = item.product.bulkPricing?.find(
              bp => quantity >= bp.minQuantity
            );
            
            return {
              ...item,
              quantity,
              selectedBulkPricing: bulkPricing
            };
          }
          return item;
        });

        set({ items: updatedItems });
      },

      clearCart: () => {
        set({ items: [] });
      },

      toggleCart: () => {
        set(state => ({ isOpen: !state.isOpen }));
      },

      getTotalItems: () => {
        const { items } = get();
        return items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        const { items } = get();
        return items.reduce((total, item) => {
          return total + get().getItemPrice(item);
        }, 0);
      },

      getItemPrice: (item: CartItem) => {
        const price = item.selectedBulkPricing?.price || item.product.price;
        return price * item.quantity;
      },

      validateMinimumOrders: () => {
        const { items } = get();
        const errors: string[] = [];
        let isValid = true;

        items.forEach(item => {
          if (item.quantity < item.product.minOrder) {
            errors.push(
              `${item.product.name}: Minimum order is ${item.product.minOrder} ${item.product.unit}`
            );
            isValid = false;
          }
          
          if (item.product.maxOrder && item.quantity > item.product.maxOrder) {
            errors.push(
              `${item.product.name}: Maximum order is ${item.product.maxOrder} ${item.product.unit}`
            );
            isValid = false;
          }
          
          if (item.quantity > item.product.stock) {
            errors.push(
              `${item.product.name}: Only ${item.product.stock} ${item.product.unit} available`
            );
            isValid = false;
          }
        });

        return { isValid, errors };
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);