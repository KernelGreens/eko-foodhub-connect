"use client";

import { useEffect } from "react";

import { useAuthStore } from "../../stores/authStore";

const AuthBootstrap = () => {
  const { initialize, isInitialized } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      void initialize();
    }
  }, [initialize, isInitialized]);

  return null;
};

export default AuthBootstrap;
