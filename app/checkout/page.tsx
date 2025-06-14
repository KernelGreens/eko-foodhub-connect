'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, CreditCard, Truck, AlertCircle } from 'lucide-react';
import { useCartStore } from '../../stores/cartStore';
import { useOrderStore } from '../../stores/orderStore';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, 
        CardContent, 
        CardDescription, 
        CardHeader, 
        CardTitle } from '../../components/ui/card';
import { Select, 
        SelectContent, 
        SelectItem, 
        SelectTrigger, 
        SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { formatCurrency } from '../../utils/format';
import { Address, PaymentMethod } from '../../types';
import Image from 'next/image';

const Checkout: React.FC = () => {
  const router = useRouter();
  const { items, getTotalPrice, clearCart, validateMinimumOrders, getItemPrice } = useCartStore();
  const { createOrder, isLoading } = useOrderStore();
  
  const [deliveryAddress, setDeliveryAddress] = useState<Address>({
    street: '',
    area: '',
    lga: '',
    state: 'Lagos',
    landmark: '',
  });
  
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('momo');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const { isValid, errors: cartErrors } = validateMinimumOrders();
  const deliveryFee = 500; // This would be calculated based on address
  const totalAmount = getTotalPrice() + deliveryFee;

  const lagosLGAs = [
    'Agege', 'Ajeromi-Ifelodun', 'Alimosho', 'Amuwo-Odofin', 'Apapa',
    'Badagry', 'Epe', 'Eti-Osa', 'Ibeju-Lekki', 'Ifako-Ijaiye',
    'Ikeja', 'Ikorodu', 'Kosofe', 'Lagos Island', 'Lagos Mainland',
    'Mushin', 'Ojo', 'Oshodi-Isolo', 'Shomolu', 'Surulere'
  ];

  const handleAddressChange = (field: keyof Address, value: string) => {
    setDeliveryAddress(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];
    
    if (!deliveryAddress.street.trim()) newErrors.push('Street address is required');
    if (!deliveryAddress.area.trim()) newErrors.push('Area is required');
    if (!deliveryAddress.lga.trim()) newErrors.push('LGA is required');
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValid || !validateForm()) {
      return;
    }

    try {
      const orderId = await createOrder(items, deliveryAddress, paymentMethod, notes);
      clearCart();
      router.push(`/order-confirmation/${orderId}`);
    } catch (error) {
      console.error('Order creation failed:', error);
      setErrors(['Failed to create order. Please try again.']);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
        <p className="text-muted-foreground mb-6">Add some products to proceed with checkout</p>
        <Button onClick={() => router.push('/products')}>
          Browse Products
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Forms */}
        <div className="space-y-6">
          {/* Validation Errors */}
          {(!isValid || errors.length > 0) && (
            <Card className="border-destructive">
              <CardContent className="p-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                  <div>
                    <h4 className="font-medium text-destructive mb-2">Please fix the following issues:</h4>
                    <ul className="text-sm text-destructive space-y-1">
                      {cartErrors.map((error, index) => (
                        <li key={`cart-${index}`}>• {error}</li>
                      ))}
                      {errors.map((error, index) => (
                        <li key={`form-${index}`}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Delivery Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Delivery Address</span>
              </CardTitle>
              <CardDescription>Where should we deliver your order?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Street Address</label>
                <Input
                  value={deliveryAddress.street}
                  onChange={(e) => handleAddressChange('street', e.target.value)}
                  placeholder="Enter your street address"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Area</label>
                  <Input
                    value={deliveryAddress.area}
                    onChange={(e) => handleAddressChange('area', e.target.value)}
                    placeholder="e.g., Ikeja GRA"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">LGA</label>
                  <Select value={deliveryAddress.lga} onValueChange={(value) => handleAddressChange('lga', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select LGA" />
                    </SelectTrigger>
                    <SelectContent>
                      {lagosLGAs.map((lga) => (
                        <SelectItem key={lga} value={lga}>{lga}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Landmark (Optional)</label>
                <Input
                  value={deliveryAddress.landmark}
                  onChange={(e) => handleAddressChange('landmark', e.target.value)}
                  placeholder="e.g., Near Computer Village"
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5" />
                <span>Payment Method</span>
              </CardTitle>
              <CardDescription>How would you like to pay?</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={paymentMethod} onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="momo">Mobile Money (MoMo)</SelectItem>
                  <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                  <SelectItem value="card">Debit/Credit Card</SelectItem>
                  <SelectItem value="ussd">USSD</SelectItem>
                  <SelectItem value="cash-on-delivery">Cash on Delivery</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Order Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Order Notes (Optional)</CardTitle>
              <CardDescription>Any special instructions for your order?</CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full p-3 border rounded-md resize-none"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Please call before delivery, Leave at gate, etc."
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Order Summary */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Truck className="w-5 h-5" />
                <span>Order Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Items */}
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.product.id} className="flex items-center space-x-3">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden"> {/* Container with fixed dimensions */}
                        <Image
                        src={item.product.images[0]}
                        alt={item.product.name}
                        fill
                        sizes="50px" // Fixed size for thumbnails
                        className="object-cover"
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground">
                        {item.quantity} {item.product.unit} × {formatCurrency(item.selectedBulkPricing?.price || item.product.price)}
                        </p>
                        {item.selectedBulkPricing && (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-xs"> {/* Deep yellow badge */}
                            Bulk discount
                        </Badge>
                        )}
                    </div>
                    <p className="font-medium">
                        {formatCurrency(getItemPrice(item))}
                    </p>
                </div>
                ))}
              </div>

              <hr />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(getTotalPrice())}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span>{formatCurrency(deliveryFee)}</span>
                </div>
                <hr />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>

              {/* Place Order Button */}
              <Button
                className="w-full"
                size="lg"
                onClick={handleSubmit}
                disabled={!isValid || isLoading}
              >
                {isLoading ? 'Processing...' : `Place Order - ${formatCurrency(totalAmount)}`}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                By placing this order, you agree to our Terms of Service and Privacy Policy
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Checkout;