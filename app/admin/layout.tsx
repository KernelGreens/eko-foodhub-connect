'use client'

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useRoleAuthGuard } from '../../lib/auth/use-role-auth-guard';
import { useAuthStore } from '../../stores/authStore';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { isChecking } = useRoleAuthGuard({
    allowedRoles: ['admin'],
    allowedAdminRoles: ['operations-admin', 'super-admin'],
  });

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <p className="text-muted-foreground">Loading admin workspace...</p>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="mt-3 text-muted-foreground">
            Sign in with an admin account to access operator tools.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Operations</h1>
          <p className="mt-1 text-muted-foreground">
            Monitor marketplace orders and advance fulfillment as {user.adminRole ?? 'admin'}.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/orders"
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              pathname === '/admin/orders'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-muted-foreground hover:text-foreground'
            }`}
          >
            Orders
          </Link>
          <Link
            href="/admin/dispatch-batches"
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              pathname === '/admin/dispatch-batches'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-muted-foreground hover:text-foreground'
            }`}
          >
            Dispatch Batches
          </Link>
          <Link
            href="/admin/vendor-applications"
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              pathname === '/admin/vendor-applications'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-muted-foreground hover:text-foreground'
            }`}
          >
            Vendor Applications
          </Link>
          <Link
            href="/admin/listings"
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              pathname === '/admin/listings'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-muted-foreground hover:text-foreground'
            }`}
          >
            Listing Review
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
};

export default AdminLayout;
