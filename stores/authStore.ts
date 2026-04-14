import { create } from 'zustand';

import type { User, Vendor } from '../types';
import { parseJsonResponse } from '../lib/http/parse-json-response';

interface AuthState {
  user: User | null;
  vendor: Vendor | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: Partial<User> & { password?: string }) => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
}

type AuthApiPayload = {
  data?: {
    user?: User | Vendor;
  } | null;
  error?: {
    message?: string;
  } | null;
};

function setAuthenticatedUser(
  set: (partial: Partial<AuthState>) => void,
  user: User | Vendor,
) {
  set({
    user,
    vendor: user.role === 'vendor' ? (user as Vendor) : null,
    isAuthenticated: true,
    isLoading: false,
    isInitialized: true,
  });
}

function clearAuthState(set: (partial: Partial<AuthState>) => void) {
  set({
    user: null,
    vendor: null,
    isAuthenticated: false,
    isLoading: false,
    isInitialized: true,
  });
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  vendor: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    try {
      const response = await fetch('/api/auth/session', {
        cache: 'no-store',
      });
      const payload = await parseJsonResponse<AuthApiPayload>(response);
      const user = payload?.data?.user;

      if (response.ok && user) {
        setAuthenticatedUser(set, {
          ...user,
          createdAt: new Date(user.createdAt),
        });
        return;
      }
    } catch (error) {
      console.error('Failed to initialize auth session.', error);
    }

    clearAuthState(set);
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      const payload = await parseJsonResponse<AuthApiPayload>(response);

      if (!response.ok || !payload?.data?.user) {
        throw new Error(
          payload?.error?.message ??
            'Login failed. Please check the server and try again.',
        );
      }

      setAuthenticatedUser(set, {
        ...payload.data.user,
        createdAt: new Date(payload.data.user.createdAt),
      });
    } catch (error) {
      set({ isLoading: false, isInitialized: true });
      throw error;
    }
  },

  logout: () => {
    void fetch('/api/auth/logout', {
      method: 'POST',
    }).catch((error) => {
      console.error('Failed to clear auth session.', error);
    });

    clearAuthState(set);
  },

  register: async (userData: Partial<User> & { password?: string }) => {
    if (userData.role === 'vendor') {
      set({ isLoading: false, isInitialized: true });
      throw new Error(
        'Vendor application and approval workflow is not implemented yet.',
      );
    }

    set({ isLoading: true });

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          password: userData.password,
        }),
      });
      const payload = await parseJsonResponse<AuthApiPayload>(response);

      if (!response.ok || !payload?.data?.user) {
        throw new Error(
          payload?.error?.message ??
            'Registration failed. The server did not return a valid response.',
        );
      }

      setAuthenticatedUser(set, {
        ...payload.data.user,
        createdAt: new Date(payload.data.user.createdAt),
      });
    } catch (error) {
      set({ isLoading: false, isInitialized: true });
      throw error;
    }
  },

  updateProfile: async (userData: Partial<User>) => {
    const { user, vendor } = get();

    if (!user) {
      return;
    }

    const updatedUser = { ...user, ...userData };

    set({
      user: updatedUser,
      vendor:
        vendor && updatedUser.role === 'vendor'
          ? ({ ...vendor, ...userData } as Vendor)
          : null,
    });
  },
}));
