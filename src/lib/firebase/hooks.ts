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
import { createJWTToken, verifyJWTToken, JWTPayload } from "../jwt";

// Kullanıcı rolleri için tip tanımlaması - User tipinden import edilecek

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
    // Client-side kontrolü
    if (typeof window === "undefined") {
      return;
    }

    const checkAuth = () => {
      console.log("🔧 checkAuth called");

      // Client-side kontrolü
      if (typeof window === "undefined") {
        console.log("🔧 checkAuth - Server-side, skipping");
        return;
      }

      let token = Cookies.get("auth-token");
      console.log("🔧 checkAuth - Cookie token:", token ? "EXISTS" : "NONE");

      // Cookie'de token yoksa localStorage ve sessionStorage'dan kontrol et
      if (!token) {
        const localToken = localStorage.getItem("auth-token");
        const sessionToken = sessionStorage.getItem("auth-token");
        const backupToken = localToken || sessionToken;
        console.log(
          "🔧 checkAuth - localStorage token:",
          localToken ? "EXISTS" : "NONE"
        );
        console.log(
          "🔧 checkAuth - sessionStorage token:",
          sessionToken ? "EXISTS" : "NONE"
        );
        console.log(
          "🔧 checkAuth - Backup token:",
          backupToken ? "EXISTS" : "NONE"
        );
        if (backupToken) {
          console.log("🔄 Token storage'dan cookie'ye geri yükleniyor");
          // Token'ı hem cookie hem storage'lara kaydet
          Cookies.set("auth-token", backupToken, {
            expires: 7,
            path: "/",
            sameSite: "lax",
          });
          localStorage.setItem("auth-token", backupToken);
          sessionStorage.setItem("auth-token", backupToken);
          token = backupToken;
        }
      }

      if (token) {
        // JWT token kontrolü
        const decoded = verifyJWTToken(token);

        if (decoded) {
          console.log("✅ checkAuth - JWT valid, setting user:", decoded.email);
          const userData = {
            uid: decoded.uid,
            email: decoded.email,
            displayName:
              decoded.role === "SUPER_ADMIN" ? "Super Admin" : "User",
            role: decoded.role as any,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastLoginAt: new Date(),
            isActive: true,
          };
          setUser(userData);
          setLoading(false);
          return;
        } else {
          console.log("❌ checkAuth - JWT invalid");
        }
      }

      console.log("❌ checkAuth - No valid token, clearing user");
      setUser(null);
      setLoading(false);
    };

    // İlk kontrol
    checkAuth();

    // Periyodik kontrol (her 5000ms - daha az agresif)
    const interval = setInterval(() => {
      checkAuth();
    }, 5000);

    // Firebase Auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Auth token'ı al ve cookie'ye kaydet
          const token = await firebaseUser.getIdToken();
          Cookies.set("auth-token", token, {
            expires: 7,
            path: "/",
            sameSite: "lax",
          });
          localStorage.setItem("auth-token", token);
          sessionStorage.setItem("auth-token", token);

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
          // Firebase user yoksa token'ı kontrol et
          const currentToken = Cookies.get("auth-token");
          if (currentToken) {
            // JWT token mı kontrol et
            const decoded = verifyJWTToken(currentToken);
            if (!decoded) {
              // JWT değilse Firebase token olabilir, temizle
              Cookies.remove("auth-token");
              localStorage.removeItem("auth-token");
              sessionStorage.removeItem("auth-token");
              setUser(null);
            }
            // JWT token varsa onu koruyalım
          }
        }
      } catch (err) {
        console.error("Auth state change error:", err);
        setError("Kullanıcı bilgileri alınamadı");
      } finally {
        setLoading(false);
      }
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []); // Sadece bir kez çalışsın

  const handleLogout = async () => {
    try {
      console.log("🚪 Logout başlatılıyor...");
      // Önce cookie'yi sil (path ile birlikte)
      Cookies.remove("auth-token", { path: "/" });
      console.log("🗑️ Cookie silindi");
      // Storage'ları da temizle
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth-token");
        sessionStorage.removeItem("auth-token");
        console.log("🗑️ Storage'lar temizlendi");
      }
      // Sonra Firebase oturumunu kapat
      await signOut(auth);
      // Son olarak state'i temizle
      setUser(null);
      console.log("✅ Logout başarılı, login sayfasına yönlendiriliyor");
    } catch (err) {
      console.error("❌ Logout error:", err);
      setError("Çıkış yapılırken bir hata oluştu");
    }
  };

  const register = async (
    email: string,
    password: string,
    displayName: string,
    role: UserRole = "USER"
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
      Cookies.set("auth-token", token, {
        expires: 7,
        path: "/",
        sameSite: "lax",
      });
      localStorage.setItem("auth-token", token);
      sessionStorage.setItem("auth-token", token);

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
      console.log("Giriş işlemi başlatılıyor...", { email, password });

      // Test kullanıcıları
      const testUsers = [
        {
          email: "admin",
          password: "admin123",
          role: "SUPER_ADMIN",
          name: "Super Admin",
        },
        {
          email: "admin@zonekult.com",
          password: "123456",
          role: "SUPER_ADMIN",
          name: "Super Admin",
        },
        {
          email: "tamer@tamerrestoran.com",
          password: "123456",
          role: "COMPANY_ADMIN",
          name: "Tamer Bey",
        },
        {
          email: "manager.merkez@tamerrestoran.com",
          password: "123456",
          role: "RESTAURANT_ADMIN",
          name: "Merkez Müdürü",
        },
      ];

      // Test kullanıcısı kontrolü
      const testUser = testUsers.find(
        (u) => u.email === email && u.password === password
      );

      if (testUser) {
        console.log("Test kullanıcısı ile giriş:", testUser);

        // JWT token oluştur
        const mockToken = createJWTToken({
          email: testUser.email,
          role: testUser.role as any,
          uid: `test-${Date.now()}`,
        });

        // Cookie'yi set et - localhost için basit ayarlar
        Cookies.set("auth-token", mockToken, {
          expires: 7,
          path: "/",
          sameSite: "lax",
        });

        // Debug: Cookie'nin set edildiğini kontrol et
        console.log("🍪 Cookie set edildi:", Cookies.get("auth-token"));

        // Browser storage'lara da kaydet (backup)
        localStorage.setItem("auth-token", mockToken);
        sessionStorage.setItem("auth-token", mockToken);
        console.log(
          "💾 Storage'lara da kaydedildi:",
          localStorage.getItem("auth-token")
        );

        // Mock user data
        const userData = {
          uid: `test-${email.replace(/[^a-zA-Z0-9]/g, "")}`,
          email: testUser.email,
          displayName: testUser.name,
          role: testUser.role as any,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date(),
          isActive: true,
        };

        setUser(userData);
        console.log("Test kullanıcısı giriş başarılı:", userData);
        return { uid: userData.uid, email: userData.email };
      }

      // Gerçek Firebase Auth deneme
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log("Firebase Auth girişi başarılı:", userCredential.user.uid);

      // Auth token'ı al ve cookie'ye kaydet
      const token = await userCredential.user.getIdToken();
      Cookies.set("auth-token", token, {
        expires: 7,
        path: "/",
        sameSite: "lax",
      });
      localStorage.setItem("auth-token", token);
      sessionStorage.setItem("auth-token", token);

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

  const isAdmin = () => user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const isSuperAdmin = () => user?.role === "SUPER_ADMIN";

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
