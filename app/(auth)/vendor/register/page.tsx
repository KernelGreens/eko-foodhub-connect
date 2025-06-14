'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Upload, MapPin, Building, User, CreditCard } from 'lucide-react';
import { useAuthStore } from '../../../../stores/authStore';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Badge } from '../../../../components/ui/badge';

interface VendorRegistrationData {
  // Personal Info
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  
  // Business Info
  businessName: string;
  businessType: string;
  businessAddress: string;
  businessLicense: string;
  taxId: string;
  
  // Hub & Products
  preferredHub: string;
  productCategories: string[];
  estimatedVolume: string;
  
  // Banking
  bankName: string;
  accountName: string;
  accountNumber: string;
  bvn: string;
}

const VendorRegistration: React.FC = () => {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<VendorRegistrationData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    businessType: '',
    businessAddress: '',
    businessLicense: '',
    taxId: '',
    preferredHub: '',
    productCategories: [],
    estimatedVolume: '',
    bankName: '',
    accountName: '',
    accountNumber: '',
    bvn: '',
  });
  const [errors, setErrors] = useState<string[]>([]);

  const steps = [
    { number: 1, title: 'Personal Information', icon: User },
    { number: 2, title: 'Business Details', icon: Building },
    { number: 3, title: 'Hub & Products', icon: MapPin },
    { number: 4, title: 'Banking Information', icon: CreditCard },
  ];

  const hubs = [
    { id: 'idi-oro', name: 'Idi-Oro Hub', location: 'Mushin', status: 'Active' },
    { id: 'ajah', name: 'Ajah Hub', location: 'Ajah', status: 'Coming Soon' },
    { id: 'agege', name: 'Agege Hub', location: 'Agege', status: 'Coming Soon' },
    { id: 'abule-ado', name: 'Abule Ado Hub', location: 'Abule Ado', status: 'Coming Soon' },
  ];

  const productCategories = [
    'fruits', 'vegetables', 'grains', 'tubers', 'meat', 'fish', 'dairy', 'spices', 'herbs', 'processed'
  ];

  const businessTypes = [
    'Individual Farmer',
    'Cooperative Society',
    'Agricultural Company',
    'Food Processor',
    'Distributor',
    'Retailer'
  ];

  const handleInputChange = (field: keyof VendorRegistrationData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCategoryToggle = (category: string) => {
    setFormData(prev => ({
      ...prev,
      productCategories: prev.productCategories.includes(category)
        ? prev.productCategories.filter(c => c !== category)
        : [...prev.productCategories, category]
    }));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: string[] = [];

    switch (step) {
      case 1:
        if (!formData.name.trim()) newErrors.push('Full name is required');
        if (!formData.email.trim()) newErrors.push('Email is required');
        if (!formData.phone.trim()) newErrors.push('Phone number is required');
        if (!formData.password) newErrors.push('Password is required');
        if (formData.password !== formData.confirmPassword) newErrors.push('Passwords do not match');
        break;
      case 2:
        if (!formData.businessName.trim()) newErrors.push('Business name is required');
        if (!formData.businessType) newErrors.push('Business type is required');
        if (!formData.businessAddress.trim()) newErrors.push('Business address is required');
        break;
      case 3:
        if (!formData.preferredHub) newErrors.push('Please select a preferred hub');
        if (formData.productCategories.length === 0) newErrors.push('Select at least one product category');
        if (!formData.estimatedVolume) newErrors.push('Estimated volume is required');
        break;
      case 4:
        if (!formData.bankName.trim()) newErrors.push('Bank name is required');
        if (!formData.accountName.trim()) newErrors.push('Account name is required');
        if (!formData.accountNumber.trim()) newErrors.push('Account number is required');
        break;
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    try {
      await register({
        ...formData,
        role: 'vendor'
      });
      router.push('/vendor/onboarding-success');
    } catch (error) {
      setErrors(['Registration failed. Please try again.']);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Full Name</label>
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email Address</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Phone Number</label>
              <Input
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+234-xxx-xxx-xxxx"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Create a strong password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Confirm Password</label>
              <Input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                placeholder="Confirm your password"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Business Name</label>
              <Input
                value={formData.businessName}
                onChange={(e) => handleInputChange('businessName', e.target.value)}
                placeholder="Enter your business name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Business Type</label>
              <Select value={formData.businessType} onValueChange={(value) => handleInputChange('businessType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent>
                  {businessTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Business Address</label>
              <textarea
                className="w-full p-3 border rounded-md resize-none"
                rows={3}
                value={formData.businessAddress}
                onChange={(e) => handleInputChange('businessAddress', e.target.value)}
                placeholder="Enter your complete business address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Business License Number (Optional)</label>
              <Input
                value={formData.businessLicense}
                onChange={(e) => handleInputChange('businessLicense', e.target.value)}
                placeholder="Enter license number if available"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Tax ID (Optional)</label>
              <Input
                value={formData.taxId}
                onChange={(e) => handleInputChange('taxId', e.target.value)}
                placeholder="Enter tax identification number"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-3">Preferred Hub Location</label>
              <div className="grid grid-cols-1 gap-3">
                {hubs.map((hub) => (
                  <div
                    key={hub.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      formData.preferredHub === hub.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    } ${hub.status === 'Coming Soon' ? 'opacity-50' : ''}`}
                    onClick={() => hub.status === 'Active' && handleInputChange('preferredHub', hub.id)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">{hub.name}</h4>
                        <p className="text-sm text-muted-foreground">{hub.location}</p>
                      </div>
                      <Badge variant={hub.status === 'Active' ? 'default' : 'secondary'}>
                        {hub.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">Product Categories</label>
              <div className="grid grid-cols-2 gap-2">
                {productCategories.map((category) => (
                  <Button
                    key={category}
                    type="button"
                    variant={formData.productCategories.includes(category) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleCategoryToggle(category)}
                    className="justify-start capitalize"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Estimated Monthly Volume</label>
              <Select value={formData.estimatedVolume} onValueChange={(value) => handleInputChange('estimatedVolume', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select estimated volume" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">{"Small (< 1 ton)"}</SelectItem>
                  <SelectItem value="medium">Medium (1-10 tons)</SelectItem>
                  <SelectItem value="large">Large (10-50 tons)</SelectItem>
                  <SelectItem value="enterprise">{"Enterprise (> 50 tons)"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Bank Name</label>
              <Input
                value={formData.bankName}
                onChange={(e) => handleInputChange('bankName', e.target.value)}
                placeholder="Enter your bank name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Account Name</label>
              <Input
                value={formData.accountName}
                onChange={(e) => handleInputChange('accountName', e.target.value)}
                placeholder="Enter account holder name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Account Number</label>
              <Input
                value={formData.accountNumber}
                onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                placeholder="Enter account number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">BVN (Optional)</label>
              <Input
                value={formData.bvn}
                onChange={(e) => handleInputChange('bvn', e.target.value)}
                placeholder="Enter Bank Verification Number"
              />
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Your banking information is encrypted and secure. 
                This will be used for payment processing and revenue transfers.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          {/* <Link href="/login" className="inline-flex items-center text-primary hover:text-primary/80 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Link> */}
          <h1 className="text-3xl font-bold text-foreground">Become a Vendor</h1>
          <p className="text-muted-foreground mt-2">
            Join Eko FoodHub Connect and start selling your products
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.number
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-muted-foreground text-muted-foreground'
                }`}>
                  {currentStep > step.number ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-full h-0.5 mx-4 ${
                    currentStep > step.number ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <p className="text-xs text-muted-foreground">{step.title}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Step {currentStep}: {steps[currentStep - 1].title}</CardTitle>
            <CardDescription>
              {currentStep === 1 && "Let's start with your personal information"}
              {currentStep === 2 && "Tell us about your business"}
              {currentStep === 3 && "Choose your hub and product categories"}
              {currentStep === 4 && "Set up your banking information"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Errors */}
            {errors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
                <ul className="text-sm text-destructive space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Step Content */}
            {renderStepContent()}

            {/* Navigation */}
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              {currentStep < 4 ? (
                <Button onClick={handleNext}>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={isLoading}>
                  {isLoading ? 'Creating Account...' : 'Complete Registration'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:text-primary/80 font-medium">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VendorRegistration;