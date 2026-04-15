"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import type { AdminRole, User } from "../../types";
import { useAuthStore } from "../../stores/authStore";

type RoleAuthGuardOptions = {
  allowedRoles: Array<User["role"]>;
  allowedAdminRoles?: AdminRole[];
};

export function useRoleAuthGuard(options: RoleAuthGuardOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const { initialize, isAuthenticated, isInitialized, user } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      void initialize();
    }
  }, [initialize, isInitialized]);

  const hasAllowedRole = user
    ? options.allowedRoles.includes(user.role) &&
      (user.role !== "admin" ||
        !options.allowedAdminRoles ||
        options.allowedAdminRoles.includes(user.adminRole ?? "operations-admin"))
    : false;

  useEffect(() => {
    if (isInitialized && (!isAuthenticated || !hasAllowedRole)) {
      router.replace(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
    }
  }, [hasAllowedRole, isAuthenticated, isInitialized, pathname, router]);

  return {
    isChecking: !isInitialized || !isAuthenticated || !hasAllowedRole,
  };
}
