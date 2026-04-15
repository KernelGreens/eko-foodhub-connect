'use client'

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, User, Menu, Bell, Search } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';
import Image from 'next/image';

const Header: React.FC = () => {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { toggleCart, getTotalItems } = useCartStore();

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Products', href: '/products' },
    { name: 'Vendors', href: '/vendors' },
    { name: 'About', href: '/about' },
  ];

  const isActive = (path: string) => pathname === path;

  const dashboardHref =
    user?.role === 'vendor'
      ? '/vendor/dashboard'
      : user?.role === 'vendor-applicant'
        ? '/vendor-application'
      : user?.role === 'admin'
        ? '/admin/orders'
        : '/profile';
  const ordersHref =
    user?.role === 'vendor'
      ? '/vendor/orders'
      : user?.role === 'vendor-applicant'
        ? '/vendor-application'
      : user?.role === 'admin'
        ? '/admin/orders'
        : '/orders';
  const settingsHref =
    user?.role === 'vendor'
      ? '/vendor/settings'
      : user?.role === 'vendor-applicant'
        ? '/vendor-application'
      : '/settings';

  return (
    <header className="bg-white border-b border-emerald-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Group */}
          <Link href="/" className="flex items-center space-x-1 hover:no-underline">
            {/* Eko Text */}
            <span className="text-2xl font-bold text-gray-900">Eko</span>
            
            {/* Logo with Connect text */}
            <div className="flex flex-col items-center mx-1">
              <div className="relative w-10 h-10">
                <Image
                  src="/lasg1.png"
                  alt="Lagos State Government Logo"
                  width={40}
                  height={40}
                  className="object-contain"
                  priority
                />
              </div>
              <span className="text-xs font-medium text-emerald-600 -mt-1">Connect</span>
            </div>
            
            {/* FoodHub Text */}
            <span className="text-2xl font-bold text-gray-900">FoodHub</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                  isActive(item.href)
                    ? 'text-emerald-600 border-b-2 border-emerald-600'
                    : 'text-gray-600 hover:text-emerald-600'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Search Bar */}
          <div className="hidden lg:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Search fresh produce..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
                  >
                    3
                  </Badge>
                </Button>
                
                {user?.role === 'buyer' && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative" 
                    onClick={toggleCart}
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {getTotalItems() > 0 && (
                      <Badge 
                        className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
                      >
                        {getTotalItems()}
                      </Badge>
                    )}
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <span className="hidden sm:block text-sm font-medium">
                        {user?.name}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={dashboardHref}>
                        {user?.role === 'vendor'
                          ? 'Dashboard'
                          : user?.role === 'vendor-applicant'
                            ? 'Application'
                          : user?.role === 'admin'
                            ? 'Admin'
                            : 'Profile'}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={ordersHref}>Orders</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={settingsHref}>Settings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-destructive">
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Button variant="ghost" asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild
                        className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700"
                >
                  <Link href="/register">Get Started</Link>
                </Button>
                {/* <Button size="lg" >
                  <span>Shop Fresh Produce</span>
                  <ArrowRight className="w-5 h-5" />
                </Button> */}
              </div>
            )}

            {/* Mobile menu button */}
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
