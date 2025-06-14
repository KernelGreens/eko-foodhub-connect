import React from 'react';
import Link from 'next/link';
import { CheckCircle, Clock, Mail, Phone } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';

const OnboardingSuccess: React.FC = () => {
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground">Registration Successful!</h1>
          <p className="text-muted-foreground mt-2">
            Welcome to Lagos Fresh Food Hub
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <span>What's Next?</span>
            </CardTitle>
            <CardDescription>
              Your vendor application is under review
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-xs font-bold text-primary">1</span>
                </div>
                <div>
                  <h4 className="font-medium">Document Verification</h4>
                  <p className="text-sm text-muted-foreground">
                    Our team will verify your business documents and information
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-xs font-bold text-primary">2</span>
                </div>
                <div>
                  <h4 className="font-medium">Hub Assignment</h4>
                  <p className="text-sm text-muted-foreground">
                    You'll be assigned to your preferred hub location
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-xs font-bold text-primary">3</span>
                </div>
                <div>
                  <h4 className="font-medium">Account Activation</h4>
                  <p className="text-sm text-muted-foreground">
                    Your vendor account will be activated within 24-48 hours
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">We'll keep you updated</h4>
              <div className="space-y-2 text-sm text-blue-800">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>Email notifications on progress</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4" />
                  <span>SMS updates for important milestones</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Button className="w-full" asChild>
            <Link href="/login">Sign In to Your Account</Link>
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/">Browse Marketplace</Link>
          </Button>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Need help? Contact our support team at{' '}
            <a href="mailto:support@lagosfreshhub.ng" className="text-primary hover:text-primary/80">
              support@lagosfreshhub.ng
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingSuccess;