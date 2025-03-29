import { create } from "zustand";
import { AuthState, User } from "./auth-types";

// Use Zustand without persist middleware since we're using IndexedDB for persistence
export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  login: (user: User, token: string) => set({ 
    user, 
    token, 
    isAuthenticated: true 
  }),
  logout: () => set({ 
    user: null, 
    token: null, 
    isAuthenticated: false 
  }),
})); 