"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuthStore } from "../../stores/authStore";

export function useBuyerAuthGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { initialize, isAuthenticated, isInitialized, user } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      void initialize();
    }
  }, [initialize, isInitialized]);

  useEffect(() => {
    if (
      isInitialized &&
      (!isAuthenticated || user?.role !== "buyer")
    ) {
      router.replace(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isInitialized, pathname, router, user?.role]);

  return {
    isChecking:
      !isInitialized || !isAuthenticated || user?.role !== "buyer",
  };
}
