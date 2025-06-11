"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "firebase/auth";
import { useAuth } from "./hooks";
import { ref, get } from "firebase/database";
import { db } from "./config";

// Auth context türü
type AuthContextType = {
  user: User | null;
  userProfile: any | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (email: string, password: string, userData: any) => Promise<any>;
  logout: () => Promise<void>;
};

// Context oluştur
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Context provider bileşeni
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [userProfile, setUserProfile] = useState<any | null>(null);

  // Kullanıcı bilgilerini Realtime Database'den al
  useEffect(() => {
    let isMounted = true;

    const fetchUserProfile = async () => {
      if (auth.user) {
        try {
          const userRef = ref(db, `users/${auth.user.uid}`);
          const snapshot = await get(userRef);

          if (snapshot.exists() && isMounted) {
            setUserProfile(snapshot.val());
          }
        } catch (error) {
          console.error("Kullanıcı profili alınırken hata:", error);
        }
      } else if (isMounted) {
        setUserProfile(null);
      }
    };

    fetchUserProfile();

    return () => {
      isMounted = false;
    };
  }, [auth.user]);

  // Tüm auth işlevlerini ve kullanıcı bilgilerini context üzerinden sağla
  const value = {
    ...auth,
    userProfile,
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
