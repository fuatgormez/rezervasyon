"use client";

import { useState, useEffect } from "react";
import { auth, db } from "./config";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import {
  ref,
  set,
  get,
  update as dbUpdate,
  remove as dbRemove,
  child,
  push,
  query as dbQuery,
  orderByChild,
  equalTo,
  onValue,
} from "firebase/database";

// Kullanıcı rolleri için tip tanımlaması
export type UserRole = "user" | "admin" | "super_admin";

// Kullanıcı profili arayüzü
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_super_admin?: boolean; // Geriye dönük uyumluluk için
  created_at?: string;
  updated_at?: string;
}

// Kullanıcı oturumu hook'u
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      if (user) {
        try {
          // Kullanıcı profil bilgilerini Realtime Database'den al
          const userRef = ref(db, `users/${user.uid}`);
          const snapshot = await get(userRef);

          if (snapshot.exists()) {
            const userData = snapshot.val();
            setUserProfile({
              id: user.uid,
              email: user.email || userData.email || "",
              name: userData.name || "",
              // Geriye dönük uyumluluk - eski is_super_admin özelliğini kontrol et
              role:
                userData.role ||
                (userData.is_super_admin ? "super_admin" : "user"),
              created_at: userData.created_at || userData.createdAt,
              updated_at: userData.updated_at || userData.updatedAt,
            });
          } else {
            // Kullanıcı var ama profil yok, varsayılan profil oluştur
            setUserProfile({
              id: user.uid,
              email: user.email || "",
              name: "",
              role: "user",
            });
          }
        } catch (error) {
          console.error("Kullanıcı profili alınırken hata:", error);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Kullanıcı profil bilgilerini Realtime Database'den al
      const userRef = ref(db, `users/${userCredential.user.uid}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const userData = snapshot.val();
        const profile = {
          id: userCredential.user.uid,
          email: userCredential.user.email || userData.email || "",
          name: userData.name || "",
          role:
            userData.role || (userData.is_super_admin ? "super_admin" : "user"),
          created_at: userData.created_at || userData.createdAt,
          updated_at: userData.updated_at || userData.updatedAt,
        };

        setUserProfile(profile);
        return { user: userCredential.user, profile };
      }

      return { user: userCredential.user, profile: null };
    } catch (error) {
      console.error("Giriş yapılırken hata:", error);
      throw error;
    }
  };

  const register = async (email: string, password: string, userData: any) => {
    try {
      const credentials = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Rol belirleme - varsayılan olarak "user"
      const role = userData.role || "user";

      // Kullanıcı profil verilerini Realtime Database'e kaydet
      const userProfile = {
        ...userData,
        email,
        role,
        is_super_admin: role === "super_admin", // Geriye dönük uyumluluk için
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await set(ref(db, `users/${credentials.user.uid}`), userProfile);

      setUserProfile({
        id: credentials.user.uid,
        email,
        name: userData.name || "",
        role,
        created_at: userProfile.created_at,
        updated_at: userProfile.updated_at,
      });

      return { user: credentials.user, profile: userProfile };
    } catch (error) {
      console.error("Kayıt olunurken hata:", error);
      throw error;
    }
  };

  const updateProfile = async (userId: string, data: Partial<UserProfile>) => {
    try {
      const userRef = ref(db, `users/${userId}`);

      // Güncellenecek verileri hazırla
      const updateData = {
        ...data,
        // Geriye dönük uyumluluk için is_super_admin güncelleme
        ...(data.role && { is_super_admin: data.role === "super_admin" }),
        updated_at: new Date().toISOString(),
      };

      await dbUpdate(userRef, updateData);

      // Mevcut profil bilgisini güncelle
      if (userProfile && userProfile.id === userId) {
        setUserProfile({
          ...userProfile,
          ...data,
          updated_at: updateData.updated_at,
        });
      }

      return true;
    } catch (error) {
      console.error("Profil güncellenirken hata:", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
    } catch (error) {
      console.error("Çıkış yapılırken hata:", error);
      throw error;
    }
  };

  // Kullanıcının belirli bir role sahip olup olmadığını kontrol et
  const hasRole = (requiredRole: UserRole): boolean => {
    if (!userProfile) return false;

    const roleHierarchy = {
      user: 1,
      admin: 2,
      super_admin: 3,
    };

    const userRoleLevel = roleHierarchy[userProfile.role] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

    // Kullanıcının rol seviyesi gereken rol seviyesinden büyük veya eşitse erişim var
    return userRoleLevel >= requiredRoleLevel;
  };

  return {
    user,
    userProfile,
    loading,
    login,
    register,
    logout,
    updateProfile,
    hasRole,
  };
}

// Realtime Database veri hook'u
export function useFirebase<T>(path: string) {
  const [documents, setDocuments] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Belirtilen yoldaki tüm verileri getir
  const getAll = async () => {
    setLoading(true);
    try {
      const dataRef = ref(db, path);
      const snapshot = await get(dataRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        // Objeyi array'e dönüştür
        const docs = Object.entries(data).map(([id, value]) => ({
          id,
          ...(value as any),
        })) as T[];

        setDocuments(docs);
        return docs;
      }
      return [];
    } catch (err: any) {
      setError(err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Belirli bir ID'ye sahip veriyi getir
  const getById = async (id: string) => {
    try {
      const dataRef = ref(db, `${path}/${id}`);
      const snapshot = await get(dataRef);

      if (snapshot.exists()) {
        return {
          id,
          ...snapshot.val(),
        } as T;
      }
      return null;
    } catch (err: any) {
      setError(err);
      return null;
    }
  };

  // Yeni veri ekle
  const add = async (data: any) => {
    try {
      const dataRef = ref(db, path);
      const newRef = push(dataRef);
      const id = newRef.key;

      await set(newRef, {
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      return { id, ...data };
    } catch (err: any) {
      setError(err);
      throw err;
    }
  };

  // Veriyi güncelle
  const updateItem = async (id: string, data: Partial<T>) => {
    try {
      const dataRef = ref(db, `${path}/${id}`);
      await dbUpdate(dataRef, {
        ...data,
        updated_at: new Date().toISOString(),
      });
      return true;
    } catch (err: any) {
      setError(err);
      return false;
    }
  };

  // Veriyi sil
  const removeItem = async (id: string) => {
    try {
      const dataRef = ref(db, `${path}/${id}`);
      await dbRemove(dataRef);
      return true;
    } catch (err: any) {
      setError(err);
      return false;
    }
  };

  return {
    documents,
    loading,
    error,
    getAll,
    getById,
    add,
    update: updateItem,
    remove: removeItem,
  };
}
