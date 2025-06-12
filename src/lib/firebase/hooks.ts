"use client";

import { useState, useEffect } from "react";
import { auth, db } from "./config";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
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
import { userService } from "@/services/userService";
import { User, UserRole } from "@/types/user";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Auth token'ı al ve cookie'ye kaydet
          const token = await firebaseUser.getIdToken();
          Cookies.set("auth-token", token, { expires: 7 }); // 7 gün geçerli

          // Firestore'dan kullanıcı bilgilerini al
          const userData = await userService.getUser(firebaseUser.uid);
          if (userData) {
            setUser(userData);
            // Son giriş zamanını güncelle
            await userService.updateLastLogin(userData.uid);
          } else {
            console.error(
              "Kullanıcı Firestore'da bulunamadı:",
              firebaseUser.uid
            );
            setError("Kullanıcı bilgileri bulunamadı");
            // Kullanıcı bilgileri bulunamazsa çıkış yap
            await handleLogout();
          }
        } else {
          // Kullanıcı çıkış yaptığında cookie'yi sil
          Cookies.remove("auth-token");
          setUser(null);
        }
      } catch (err) {
        console.error("Auth state change error:", err);
        setError("Kullanıcı bilgileri alınamadı");
        // Hata durumunda çıkış yap
        await handleLogout();
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      // Önce cookie'yi sil
      Cookies.remove("auth-token");
      // Sonra Firebase oturumunu kapat
      await signOut(auth);
      // Son olarak state'i temizle
      setUser(null);
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
      setError("Çıkış yapılırken bir hata oluştu");
    }
  };

  const register = async (
    email: string,
    password: string,
    displayName: string,
    role: UserRole = "user"
  ) => {
    try {
      setError(null);
      console.log("Kayıt işlemi başlatılıyor...");

      // Firebase Auth ile kullanıcı oluştur
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log(
        "Firebase Auth kullanıcısı oluşturuldu:",
        userCredential.user.uid
      );

      // Auth token'ı al ve cookie'ye kaydet
      const token = await userCredential.user.getIdToken();
      Cookies.set("auth-token", token, { expires: 7 });

      // Firestore'da kullanıcı profilini oluştur
      const newUser: User = {
        uid: userCredential.user.uid,
        email: email,
        displayName: displayName,
        role: role,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
        isActive: true,
      };

      await userService.createUser(newUser);
      console.log("Firestore kullanıcı profili oluşturuldu");

      return userCredential.user;
    } catch (err: any) {
      console.error("Register error:", err);
      let errorMessage = "Kayıt işlemi başarısız oldu";

      if (err.code === "auth/email-already-in-use") {
        errorMessage = "Bu e-posta adresi zaten kullanımda";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Geçersiz e-posta adresi";
      } else if (err.code === "auth/weak-password") {
        errorMessage = "Şifre çok zayıf";
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      console.log("Giriş işlemi başlatılıyor...");

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log("Firebase Auth girişi başarılı:", userCredential.user.uid);

      // Auth token'ı al ve cookie'ye kaydet
      const token = await userCredential.user.getIdToken();
      Cookies.set("auth-token", token, { expires: 7 });

      const userData = await userService.getUser(userCredential.user.uid);
      console.log("Firestore kullanıcı bilgileri alındı:", userData);

      if (userData) {
        setUser(userData);
        await userService.updateLastLogin(userData.uid);
        console.log("Son giriş zamanı güncellendi");
      } else {
        throw new Error("Kullanıcı bilgileri bulunamadı");
      }

      return userCredential.user;
    } catch (err: any) {
      console.error("Login error:", err);
      let errorMessage = "Giriş başarısız oldu";

      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        errorMessage = "E-posta veya şifre hatalı";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Geçersiz e-posta adresi";
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const isAdmin = () => user?.role === "admin" || user?.role === "super_admin";
  const isSuperAdmin = () => user?.role === "super_admin";

  return {
    user,
    loading,
    error,
    register,
    login,
    logout: handleLogout,
    isAdmin,
    isSuperAdmin,
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
