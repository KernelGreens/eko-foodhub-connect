import { create } from 'zustand';
import { User, Vendor } from '../types/index';

interface AuthState {
  user: User | null;
  vendor: Vendor | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: Partial<User>) => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
}

// Mock data for development
const mockUsers: (User | Vendor)[] = [
  {
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
  } as Vendor,
  {
    id: '2',
    email: 'buyer@example.com',
    name: 'Kemi Oladele',
    phone: '+234-802-345-6789',
    role: 'buyer',
    createdAt: new Date(),
    isVerified: true,
  } as User,
];

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  vendor: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    
    // Mock authentication
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const user = mockUsers.find(u => u.email === email);
    if (user) {
      set({ 
        user,
        vendor: user.role === 'vendor' ? user as Vendor : null,
        isAuthenticated: true,
        isLoading: false 
      });
    } else {
      set({ isLoading: false });
      throw new Error('Invalid credentials');
    }
  },

  logout: () => {
    set({ 
      user: null, 
      vendor: null, 
      isAuthenticated: false 
    });
  },

  register: async (userData: Partial<User>) => {
    set({ isLoading: true });
    
    // Mock registration
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newUser: User = {
      id: Date.now().toString(),
      email: userData.email!,
      name: userData.name!,
      phone: userData.phone!,
      role: userData.role || 'buyer',
      createdAt: new Date(),
      isVerified: false,
    };
    
    set({ 
      user: newUser,
      isAuthenticated: true,
      isLoading: false 
    });
  },

  updateProfile: async (userData: Partial<User>) => {
    const { user } = get();
    if (user) {
      const updatedUser = { ...user, ...userData };
      set({ user: updatedUser });
    }
  },
}));