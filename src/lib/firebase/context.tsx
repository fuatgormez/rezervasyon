"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "firebase/auth";
import { useAuth, UserProfile, UserRole } from "./hooks";
import { ref, get } from "firebase/database";
import { db } from "./config";

// Auth context türü
type AuthContextType = {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (email: string, password: string, userData: any) => Promise<any>;
  logout: () => Promise<void>;
  updateProfile: (
    userId: string,
    data: Partial<UserProfile>
  ) => Promise<boolean>;
  hasRole: (requiredRole: UserRole) => boolean;
};

// Context oluştur
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Context provider bileşeni
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  // Tüm auth işlevlerini ve kullanıcı bilgilerini context üzerinden sağla
  const value = {
    ...auth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook
export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error(
      "useAuthContext hook'u bir AuthProvider içinde kullanılmalıdır"
    );
  }
  return context;
}
