'use client'

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Users, Truck, Shield, TrendingUp, MapPin, Clock, Leaf, Sprout, Wheat, ShoppingBasket } from 'lucide-react';
import { useProductStore } from '../stores/productStore';
import ProductGrid from '../components/products/productGrid';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

const Home: React.FC = () => {
  const { products, fetchProducts, isLoading } = useProductStore();
  const router = useRouter();

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const featuredProducts = products.slice(0, 4);

  const stats = [
    { label: 'Active Vendors', value: '348', icon: Users },
    { label: 'Products Available', value: '2,500+', icon: ShoppingBasket },
    { label: 'Orders Delivered', value: '15,000+', icon: Truck },
    { label: 'Revenue Generated', value: '₦2.5B', icon: TrendingUp },
  ];

  const hubs = [
    { name: 'Idi-Oro Hub', location: 'Mushin', status: 'Active', vendors: 348 },
    { name: 'Ajah Hub', location: 'Ajah', status: 'Coming Soon', vendors: 0 },
    { name: 'Agege Hub', location: 'Agege', status: 'Coming Soon', vendors: 0 },
    { name: 'Abule Ado Hub', location: 'Abule Ado', status: 'Coming Soon', vendors: 0 },
  ];

  const handleBecomingVendor = () =>{
    router.push('/vendor/register')
  }

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-emerald-50 to-lime-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 bg-emerald-100 text-emerald-800 w-fit px-4 py-2 rounded-full">
                  <Leaf className="w-5 h-5" />
                  <span className="font-medium">Farm Fresh Direct</span>
                </div>
                <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  Fresh Food,
                  <span className="text-emerald-600"> Direct</span> from
                  <span className="text-lime-600"> Lagos Farms</span>
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Connect with local farmers and vendors at Lagos State&apos;s premier food hub. 
                  Get the freshest produce delivered to your doorstep while supporting local agriculture.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700">
                  <Link href="/products"> Shop Fresh Produce </Link>
                  <ArrowRight className="w-5 h-5" />
                </Button>
                <Button variant="outline" 
                        size="lg"
                        onClick={handleBecomingVendor}
                        className="border-emerald-600 text-emerald-600 hover:bg-emerald-50">
                  Become a Vendor
                </Button>
              </div>

              <div className="flex items-center space-x-8 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>Same-day delivery</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>Quality guaranteed</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <img
                src="https://images.pexels.com/photos/1300972/pexels-photo-1300972.jpeg"
                alt="Fresh produce at Lagos Food Hub"
                className="rounded-2xl shadow-2xl border-4 border-emerald-100"
              />
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-xl shadow-lg border border-emerald-100">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Sprout className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">348 Active Vendors</p>
                    <p className="text-sm text-gray-600">Serving Lagos daily</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="w-8 h-8 text-emerald-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Fresh Products Available Now
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover the freshest produce from our verified vendors across Lagos State
            </p>
          </div>

          <ProductGrid 
            products={featuredProducts} 
            isLoading={isLoading}
          />

          <div className="text-center mt-12">
            <Link href="/products">
              <Button size="lg" variant="outline" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50">
                View All Products
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Hub Locations */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Our Hub Locations
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Expanding across Lagos to bring fresh food closer to you
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {hubs.map((hub, index) => (
              <Card key={index} className="text-center p-6 hover:border-emerald-300 transition-colors">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{hub.name}</h3>
                <p className="text-gray-600 mb-3">{hub.location}</p>
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <span className={`w-2 h-2 rounded-full ${
                    hub.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}></span>
                  <span className="text-sm text-gray-600">{hub.status}</span>
                </div>
                {hub.vendors > 0 && (
                  <p className="text-sm text-emerald-600">{hub.vendors} vendors</p>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-emerald-600 to-lime-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Wheat className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Join Lagos Fresh Food Hub?
          </h2>
          <p className="text-xl text-emerald-100 mb-8 max-w-2xl mx-auto">
            Whether you&apos;re a farmer, vendor, or buyer, we have the perfect solution for you
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="secondary" size="lg" className="bg-white text-emerald-700 hover:bg-gray-100">
              Start Buying
            </Button>
            <Button onClick={handleBecomingVendor}
                    variant="outline" 
                    size="lg" 
                    className="border-white text-white hover:bg-white hover:text-emerald-600">
              Become a Vendor
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
