import { create } from 'zustand';
import { User, Vendor } from '../types/index';
import { Clerk } from '@clerk/clerk-js';

interface AuthState {
  user: User | null;
  vendor: Vendor | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: Partial<User>) => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  initializeClerk: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  vendor: null,
  isAuthenticated: false,
  isLoading: false,

  initializeClerk: async () => {
    const clerk = new Clerk(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!);
    await clerk.load();
    
    // Listen to authentication changes
    clerk.addListener(auth => {
      if (auth.userId) {
        // Fetch your additional user data from your backend
        const fetchUserData = async () => {
          const response = await fetch(`/api/users/${auth.userId}`);
          const userData = await response.json();
          
          set({
            user: userData,
            vendor: userData.role === 'vendor' ? userData as Vendor : null,
            isAuthenticated: true
          });
        };
        fetchUserData();
      } else {
        set({ user: null, vendor: null, isAuthenticated: false });
      }
    });
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const clerk = get().clerk;
      await clerk.signIn.create({ identifier: email, password });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    const clerk = get().clerk;
    await clerk.signOut();
    set({ user: null, vendor: null, isAuthenticated: false });
  },

  register: async (userData: Partial<User>) => {
    set({ isLoading: true });
    try {
      const clerk = get().clerk;
      // First create Clerk user
      await clerk.signUp.create({
        emailAddress: userData.email!,
        password: userData.password!,
      });
      
      // Then create user in your backend with additional data
      await fetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
    } finally {
      set({ isLoading: false });
    }
  },

  updateProfile: async (userData: Partial<User>) => {
    const { user } = get();
    if (user) {
      // Update in Clerk
      const clerk = get().clerk;
      await clerk.user.update(user.id, userData);
      
      // Update in your backend
      await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify(userData)
      });
      
      const updatedUser = { ...user, ...userData };
      set({ user: updatedUser });
    }
  },
}));