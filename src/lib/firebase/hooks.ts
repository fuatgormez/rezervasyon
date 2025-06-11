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

// Kullanıcı oturumu hook'u
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email: string, password: string, userData: any) => {
    const credentials = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Kullanıcı profil verilerini Realtime Database'e kaydet
    await set(ref(db, `users/${credentials.user.uid}`), {
      ...userData,
      email,
      createdAt: new Date().toISOString(),
    });

    return credentials;
  };

  const logout = () => {
    return signOut(auth);
  };

  return {
    user,
    loading,
    login,
    register,
    logout,
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
        createdAt: new Date().toISOString(),
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
        updatedAt: new Date().toISOString(),
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
