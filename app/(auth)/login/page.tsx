'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, Leaf, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, 
        CardContent, 
        CardDescription, 
        CardHeader, 
        CardTitle } from '../../../components/ui/card';

const Login: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(formData.email, formData.password);
      router.push(searchParams.get('callbackUrl') || '/');
    } catch {
      setError('Invalid email or password');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
  <div className="max-w-md w-full space-y-8">
    <div className="text-center">
      <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <Leaf className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
      <p className="mt-2 text-emerald-600">Sign in to your Eko FoodHub Connect account</p>
    </div>

    <Card className="border border-emerald-100">
      <CardHeader>
        <CardTitle className="text-gray-900">Sign In</CardTitle>
        <CardDescription className="text-gray-600">Enter your credentials to access your account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="pl-10 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={handleChange}
                className="pl-10 pr-12 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                placeholder="Enter your password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 text-gray-500 hover:text-emerald-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-600">Remember me</span>
            </label>
            <Link href="/forgot-password" className="text-sm text-emerald-600 hover:text-emerald-700">
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </span>
            ) : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-emerald-600 hover:text-emerald-700 font-medium">
              Create a buyer account
            </Link>
          </p>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-emerald-100 rounded-lg border border-emerald-200">
          <p className="text-sm text-emerald-800 font-medium mb-2">Testing Access:</p>
          <div className="text-sm text-emerald-700 space-y-1">
            <p><strong>Buyer:</strong> register a buyer account, or use buyer@example.com / password in local development.</p>
            <p><strong>Vendor demo:</strong> vendor@example.com / password</p>
            <p><strong>Admin demo:</strong> admin@example.com / password</p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</div>
  );
};

export default Login;
