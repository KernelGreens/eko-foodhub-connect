'use client'
import React from 'react';
import { X, Plus, Minus, ShoppingBag, Trash2 } from 'lucide-react';
import { useCartStore } from '../../stores/cartStore';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { formatCurrency } from '../../utils/format';
import Link from 'next/link';

const CartDrawer: React.FC = () => {
  const {
    items,
    isOpen,
    toggleCart,
    updateQuantity,
    removeItem,
    getTotalPrice,
    getTotalItems,
    getItemPrice,
    validateMinimumOrders
  } = useCartStore();

  const { isValid, errors } = validateMinimumOrders();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={toggleCart}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-background shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Shopping Cart</h2>
          <Button variant="ghost" size="icon" onClick={toggleCart}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Your cart is empty</h3>
              <p className="text-muted-foreground mb-4">Add some fresh products to get started</p>
              <Button onClick={toggleCart} asChild>
                <Link href="/products">Browse Products</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.product.id} className="border rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">
                        {item.product.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(item.selectedBulkPricing?.price || item.product.price)} per {item.product.unit}
                      </p>
                      
                      {item.selectedBulkPricing && (
                        <Badge variant="secondary" className="mt-1">
                          Bulk discount: {item.selectedBulkPricing.discount}% off
                        </Badge>
                      )}
                      
                      {item.quantity < item.product.minOrder && (
                        <p className="text-xs text-destructive mt-1">
                          Min order: {item.product.minOrder} {item.product.unit}
                        </p>
                      )}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.product.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      
                      <span className="w-12 text-center font-medium">
                        {item.quantity}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatCurrency(getItemPrice(item))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} {item.product.unit}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t p-4 space-y-4">
            {/* Validation Errors */}
            {!isValid && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm font-medium text-destructive mb-1">
                  Please fix the following issues:
                </p>
                <ul className="text-xs text-destructive space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Total */}
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">
                  {getTotalItems()} items
                </p>
                <p className="text-lg font-bold">
                  {formatCurrency(getTotalPrice())}
                </p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="space-y-2">
              <Button 
                className="w-full" 
                disabled={!isValid}
                onClick={toggleCart}
                asChild
              >
                <Link href="/checkout">
                  Proceed to Checkout
                </Link>
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={toggleCart}
                asChild
              >
                <Link href="/products">
                  Continue Shopping
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;