import { create } from 'zustand';
import { User, Vendor } from '../types/index';

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

const mockVendorUser: Vendor = {
  id: '1',
  email: 'vendor@example.com',
  name: 'Adebayo Farms',
  phone: '+234-801-234-5678',
  role: 'vendor',
  createdAt: new Date(),
  isVerified: true,
  businessName: 'Adebayo Fresh Farms',
  businessAddress: '15 Market Street, Idi-Oro, Mushin',
  hubLocation: 'idi-oro',
  vendorId: 'VEN001',
  rating: 4.8,
  totalSales: 2500000,
  isActive: true,
};

function setAuthenticatedUser(set: (partial: Partial<AuthState>) => void, user: User | Vendor) {
  set({
    user,
    vendor: user.role === 'vendor' ? (user as Vendor) : null,
    isAuthenticated: true,
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
      const payload = await response.json();
      const user = payload?.data?.user as User | undefined;

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

    set({
      user: null,
      vendor: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: true,
    });
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });

    if (email === mockVendorUser.email && password === 'password') {
      setAuthenticatedUser(set, mockVendorUser);
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.data?.user) {
        throw new Error(payload?.error?.message ?? 'Invalid credentials');
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

    set({
      user: null,
      vendor: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: true,
    });
  },

  register: async (userData: Partial<User> & { password?: string }) => {
    set({ isLoading: true });

    if (userData.role === 'vendor') {
      setAuthenticatedUser(set, {
        ...mockVendorUser,
        email: userData.email ?? mockVendorUser.email,
        name: userData.name ?? mockVendorUser.name,
        phone: userData.phone ?? mockVendorUser.phone,
        businessName: userData.name ?? mockVendorUser.businessName,
      });
      return;
    }

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
      const payload = await response.json();

      if (!response.ok || !payload?.data?.user) {
        throw new Error(payload?.error?.message ?? 'Registration failed');
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
    const { user } = get();
    if (user) {
      const updatedUser = { ...user, ...userData };
      set({ user: updatedUser });
    }
  },
}));
