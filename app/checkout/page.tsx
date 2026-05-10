'use client'

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, CreditCard, Truck, AlertCircle, LogIn, RefreshCw } from 'lucide-react';
import { useCartStore } from '../../stores/cartStore';
import { useOrderStore } from '../../stores/orderStore';
import { useAuthStore } from '../../stores/authStore';
import { DELIVERY_SCHEDULING_UNAVAILABLE_COPY } from '../../lib/delivery/scheduling-policy';
import { getPaymentMethodLabel, getPaymentModeCopy } from '../../lib/payments/payment-display';
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

type CartQuote = {
  isValid: boolean;
  errors: string[];
  coverageAvailable: boolean;
  subtotal: number;
  deliveryFee: number;
  total: number;
  currencyCode: string;
  deliveryEstimate: string;
  lineItems: Array<{
    productId: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    lineTotal: number;
  }>;
};

const Checkout: React.FC = () => {
  const router = useRouter();
  const { initialize, isAuthenticated, isInitialized, user } = useAuthStore();
  const { items, getTotalPrice, clearCart, validateMinimumOrders, getItemPrice } = useCartStore();
  const { setCurrentOrder } = useOrderStore();
  
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
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteRefreshToken, setQuoteRefreshToken] = useState(0);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [lastOrderAttemptAt, setLastOrderAttemptAt] = useState<Date | null>(null);

  const { isValid, errors: cartErrors } = validateMinimumOrders();
  const isBuyerAuthenticated = isInitialized && isAuthenticated && user?.role === 'buyer';
  const callbackUrl = '/checkout';

  const lagosLGAs = [
    'Agege', 'Ajeromi-Ifelodun', 'Alimosho', 'Amuwo-Odofin', 'Apapa',
    'Badagry', 'Epe', 'Eti-Osa', 'Ibeju-Lekki', 'Ifako-Ijaiye',
    'Ikeja', 'Ikorodu', 'Kosofe', 'Lagos Island', 'Lagos Mainland',
    'Mushin', 'Ojo', 'Oshodi-Isolo', 'Shomolu', 'Surulere'
  ];

  const handleAddressChange = (field: keyof Address, value: string) => {
    setDeliveryAddress(prev => ({ ...prev, [field]: value }));
    setOrderError(null);
  };

  useEffect(() => {
    if (!isInitialized) {
      void initialize();
    }
  }, [initialize, isInitialized]);

  useEffect(() => {
    let isMounted = true;

    async function fetchQuote() {
      if (items.length === 0) {
        if (isMounted) {
          setQuote(null);
          setQuoteError(null);
        }
        return;
      }

      setIsQuoteLoading(true);
      setQuoteError(null);

      try {
        const response = await fetch('/api/buyer/cart/quote', {
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
          }),
        });

        if (!response.ok) {
          throw new Error(`Quote request failed: ${response.status}`);
        }

        const payload = await response.json();

        if (!isMounted) {
          return;
        }

        setQuote(payload?.data ?? null);
      } catch (error) {
        console.error('Failed to fetch checkout quote.', error);

        if (!isMounted) {
          return;
        }

        setQuoteError('Unable to calculate delivery and totals right now.');
        setQuote(null);
      } finally {
        if (isMounted) {
          setIsQuoteLoading(false);
        }
      }
    }

    void fetchQuote();

    return () => {
      isMounted = false;
    };
  }, [deliveryAddress, items, quoteRefreshToken]);

  const quoteLineItemMap = useMemo(() => {
    return new Map(quote?.lineItems.map((item) => [item.productId, item]) ?? []);
  }, [quote]);

  const deliveryFee = quote?.deliveryFee ?? 0;
  const totalAmount = quote?.total ?? getTotalPrice();
  const subtotalAmount = quote?.subtotal ?? getTotalPrice();
  const backendErrors = quote?.errors ?? [];
  const paymentModeCopy = getPaymentModeCopy(paymentMethod);

  const validateForm = (): boolean => {
    const newErrors: string[] = [];
    
    if (!deliveryAddress.street.trim()) newErrors.push('Street address is required');
    if (!deliveryAddress.area.trim()) newErrors.push('Area is required');
    if (!deliveryAddress.lga.trim()) newErrors.push('LGA is required');
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const refreshQuote = () => {
    setQuoteRefreshToken((current) => current + 1);
  };

  const handleSubmit = async () => {
    setOrderError(null);

    if (!isBuyerAuthenticated) {
      setOrderError('Sign in as a buyer before placing this order.');
      return;
    }
    
    if (!isValid || !validateForm() || !quote?.isValid) {
      if (!quote?.isValid) {
        setOrderError('Refresh the order summary and fix any checkout issues before placing this order.');
      }
      return;
    }

    setIsSubmittingOrder(true);
    setLastOrderAttemptAt(new Date());

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

      if (response.status === 401) {
        throw new Error('Your session expired. Sign in again before placing this order.');
      }

      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error?.message ?? 'Failed to create order.');
      }

      const order = {
        ...payload.data,
        createdAt: new Date(payload.data.createdAt),
        updatedAt: new Date(payload.data.updatedAt),
      };

      setCurrentOrder(order);
      clearCart();
      router.push(`/order-confirmation/${order.id}`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to create order. Please try again.';
      console.error('Order creation failed:', error);
      setOrderError(message);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Checking your account...</h1>
        <p className="text-muted-foreground">Confirming whether checkout can continue.</p>
      </div>
    );
  }

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
          {!isBuyerAuthenticated && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <LogIn className="w-5 h-5 text-amber-700 mt-0.5" />
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-amber-900">Sign in to place this order</h4>
                      <p className="text-sm text-amber-800">
                        You can review your cart and delivery details here, but checkout requires a buyer account before payment or fulfillment can start.
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={() =>
                        router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)
                      }
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      Sign In To Continue
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {(!isValid || errors.length > 0 || backendErrors.length > 0 || quoteError || orderError) && (
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
                      {backendErrors.map((error, index) => (
                        <li key={`quote-${index}`}>• {error}</li>
                      ))}
                      {errors.map((error, index) => (
                        <li key={`form-${index}`}>• {error}</li>
                      ))}
                      {quoteError && <li>• {quoteError}</li>}
                      {orderError && <li>• {orderError}</li>}
                    </ul>
                    {orderError && (
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={refreshQuote}
                          disabled={isQuoteLoading}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Refresh Summary
                        </Button>
                        {!isBuyerAuthenticated && (
                          <Button
                            type="button"
                            onClick={() =>
                              router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)
                            }
                          >
                            <LogIn className="w-4 h-4 mr-2" />
                            Sign In
                          </Button>
                        )}
                      </div>
                    )}
                    {lastOrderAttemptAt && orderError && (
                      <p className="mt-3 text-xs text-destructive/80">
                        Last attempt: {lastOrderAttemptAt.toLocaleTimeString()}
                      </p>
                    )}
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
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                {DELIVERY_SCHEDULING_UNAVAILABLE_COPY}
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
              <CardDescription>{paymentModeCopy.description}</CardDescription>
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
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <span className="font-medium">{paymentModeCopy.label}:</span>{' '}
                {getPaymentMethodLabel(paymentMethod)} will be recorded for this test order.
              </div>
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
                        {item.quantity} {item.product.unit} × {formatCurrency((quoteLineItemMap.get(item.product.id)?.unitPrice ?? item.selectedBulkPricing?.price) || item.product.price)}
                        </p>
                        {(quoteLineItemMap.get(item.product.id)?.unitPrice ?? item.selectedBulkPricing?.price) !== item.product.price && (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-xs"> {/* Deep yellow badge */}
                            Bulk discount
                        </Badge>
                        )}
                    </div>
                    <p className="font-medium">
                        {formatCurrency(quoteLineItemMap.get(item.product.id)?.lineTotal ?? getItemPrice(item))}
                    </p>
                </div>
                ))}
              </div>

              <hr />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span>{isQuoteLoading ? 'Calculating...' : formatCurrency(deliveryFee)}</span>
                </div>
                {quote && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Delivery Plan</span>
                    <span>{quote.deliveryEstimate}</span>
                  </div>
                )}
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
                disabled={!isValid || isSubmittingOrder || isQuoteLoading || !quote?.isValid}
              >
                {!isBuyerAuthenticated
                  ? 'Sign In Required'
                  : isSubmittingOrder
                  ? 'Processing...'
                  : isQuoteLoading
                    ? 'Calculating total...'
                    : `Place Order - ${formatCurrency(totalAmount)}`}
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
