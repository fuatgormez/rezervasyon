"use client";

import { deleteApp, getApps } from "firebase/app";
import { db } from "./config";

/**
 * Tarayıcıda Firebase bağlantısını tamamen sıfırlar
 * Bu fonksiyon, Firebase uygulamasını siler ve tarayıcıyı yenilemeyi önerir
 */
export const resetFirebaseConnection = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    console.log("Firebase bağlantısı sıfırlanıyor...");

    // Tüm Firebase uygulamalarını kapat
    const apps = getApps();
    const closePromises = apps.map(async (app) => {
      try {
        await deleteApp(app);
        return true;
      } catch (error) {
        console.error(`Firebase uygulaması kapatılırken hata:`, error);
        return false;
      }
    });

    await Promise.all(closePromises);
    console.log("Tüm Firebase uygulamaları kapatıldı");

    // LocalStorage'daki Firebase önbellek verisini temizle
    try {
      if (typeof window !== "undefined") {
        const firebaseLocalStorageKeys = Object.keys(localStorage).filter(
          (key) =>
            key.startsWith("firebase:") ||
            key.includes("firebaseLocalStorageDb")
        );

        firebaseLocalStorageKeys.forEach((key) => {
          localStorage.removeItem(key);
        });

        console.log("Firebase localStorage verileri temizlendi");
      }
    } catch (lsError) {
      console.error("localStorage temizlenirken hata:", lsError);
    }

    // Tarayıcı önbelleğini temizleme tavsiyesi
    return {
      success: true,
      message:
        "Firebase bağlantısı başarıyla sıfırlandı. Tarayıcıyı yenilemeniz önerilir.",
    };
  } catch (error) {
    console.error("Firebase sıfırlama hatası:", error);
    return {
      success: false,
      message: `Firebase sıfırlama hatası: ${
        error instanceof Error ? error.message : "Bilinmeyen hata"
      }`,
    };
  }
};
