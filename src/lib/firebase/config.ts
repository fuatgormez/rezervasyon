"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getDatabase, ref, get, child } from "firebase/database";
import { getStorage } from "firebase/storage";

// Firebase konfigürasyon bilgilerinizi buraya ekleyin
const firebaseConfig = {
  apiKey: "AIzaSyByClqBNKHksI8q-19Tl3-f11lcIyFut3I",
  authDomain: "reservation-4d834.firebaseapp.com",
  projectId: "reservation-4d834",
  storageBucket: "reservation-4d834.appspot.com",
  messagingSenderId: "596668101209",
  appId: "1:596668101209:web:913eb76908a38f3c1a3748",
  measurementId: "G-S9LGR32X5Q",
  databaseURL: "https://reservation-4d834-default-rtdb.firebaseio.com/",
};

// Firebase'i başlat veya mevcut olanı getir
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Realtime Database başlat
const db = getDatabase(app);

// Firebase servislerini dışa aktar
const auth = getAuth(app);

// Geliştirme ortamında emülatör kullanma (istenirse açılabilir)
// if (typeof window !== "undefined" && window.location.hostname === "localhost") {
//   connectAuthEmulator(auth, "http://localhost:9099");
// }

const storage = getStorage(app);

// Firebase durumunu kontrol et
export const checkFirebaseConnection = async () => {
  try {
    // Basit bir realtime database okuma işlemi
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, "_connection_test"));
    console.log("Firebase bağlantısı başarılı");
    return { success: true };
  } catch (error) {
    console.error("Firebase bağlantı hatası:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Bilinmeyen bir hata",
    };
  }
};

export { auth, db, storage };
export default app;
