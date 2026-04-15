'use client'

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useRoleAuthGuard } from '../../lib/auth/use-role-auth-guard';
import { useAuthStore } from '../../stores/authStore';

interface LogisticsLayoutProps {
  children: React.ReactNode;
}

const LogisticsLayout: React.FC<LogisticsLayoutProps> = ({ children }) => {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { isChecking } = useRoleAuthGuard({
    allowedRoles: ['logistics'],
  });

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <p className="text-muted-foreground">Loading logistics workspace...</p>
      </div>
    );
  }

  if (user?.role !== 'logistics') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="mt-3 text-muted-foreground">
            Sign in with a logistics operator account to access delivery tools.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Logistics Workspace</h1>
          <p className="mt-1 text-muted-foreground">
            Manage assigned deliveries and complete buyer handoff.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/logistics/deliveries"
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              pathname === '/logistics/deliveries'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-muted-foreground hover:text-foreground'
            }`}
          >
            Deliveries
          </Link>
          <Link
            href="/logistics/dispatch-batches"
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              pathname === '/logistics/dispatch-batches'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-muted-foreground hover:text-foreground'
            }`}
          >
            Dispatch Batches
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
};

export default LogisticsLayout;
