import { NextResponse } from "next/server";
import {
  getDatabase,
  ref,
  set,
  get,
  push,
  serverTimestamp,
} from "firebase/database";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { db } from "@/lib/firebase/config";

// API'nin dinamik olarak çalışmasını sağlar (önbellekleme yok)
export const dynamic = "force-dynamic";

// Varsayılan masa kategorileri
const defaultTableCategories = [
  { id: "salon", name: "Salon", color: "#4f46e5" },
  { id: "bahce", name: "Bahçe", color: "#10b981" },
  { id: "teras", name: "Teras", color: "#f59e0b" },
];

// Varsayılan masalar
const defaultTables = [
  {
    id: "table1",
    name: "Masa 1",
    category: "salon",
    capacity: 4,
    isActive: true,
    coordinates: { x: 50, y: 50 },
  },
  {
    id: "table2",
    name: "Masa 2",
    category: "salon",
    capacity: 2,
    isActive: true,
    coordinates: { x: 150, y: 50 },
  },
  {
    id: "table3",
    name: "Masa 3",
    category: "bahce",
    capacity: 6,
    isActive: true,
    coordinates: { x: 50, y: 150 },
  },
  {
    id: "table4",
    name: "Masa 4",
    category: "teras",
    capacity: 8,
    isActive: true,
    coordinates: { x: 150, y: 150 },
  },
];

// Firebase yapılandırması
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

// Varsayılan database yapısını hazırla
const defaultSettings = {
  companyName: "Rezervasyon Sistemi",
  startTime: "09:00",
  endTime: "23:00",
  timeSlot: 30,
  allowMultipleReservationsPerTimeSlot: true,
  minReservationTime: 30,
  language: "tr",
  theme: "light",
  reservationRules: {
    requirePhone: true,
    requireEmail: false,
    confirmationRequired: false,
    cancellationAllowed: true,
    maxAdvanceDays: 30,
    minNoticeMinutes: 60,
  },
};

// Veritabanını başlatmak için API endpoint
export async function GET() {
  const results: string[] = [];

  try {
    // Firebase için özel bir instance oluştur (server-side)
    const app = initializeApp(firebaseConfig, "init-db-server");
    const db = getDatabase(app);

    // Settings kontrolü ve oluşturma
    const settingsRef = ref(db, "settings");
    try {
      const settingsSnapshot = await get(settingsRef);
      if (!settingsSnapshot.exists()) {
        await set(settingsRef, defaultSettings);
        results.push("Ayarlar başarıyla oluşturuldu");
      } else {
        results.push("Ayarlar zaten mevcut, değişiklik yapılmadı");
      }
    } catch (error: any) {
      results.push(`settings okuma izni hatası: ${error.message}`);
    }

    // Tables kontrolü ve oluşturma
    const tablesRef = ref(db, "tables");
    try {
      const tablesSnapshot = await get(tablesRef);
      if (!tablesSnapshot.exists()) {
        await set(tablesRef, defaultTables);
        results.push("Masalar başarıyla oluşturuldu");
      } else {
        results.push("Masalar zaten mevcut, değişiklik yapılmadı");
      }
    } catch (error: any) {
      results.push(`tables okuma izni hatası: ${error.message}`);
    }

    // Table Categories kontrolü ve oluşturma
    const tableCategoriesRef = ref(db, "table_categories");
    try {
      const tableCategoriesSnapshot = await get(tableCategoriesRef);
      if (!tableCategoriesSnapshot.exists()) {
        await set(tableCategoriesRef, defaultTableCategories);
        results.push("Masa kategorileri başarıyla oluşturuldu");
      } else {
        results.push("Masa kategorileri zaten mevcut, değişiklik yapılmadı");
      }
    } catch (error: any) {
      results.push(`table_categories okuma izni hatası: ${error.message}`);
    }

    // Reservations kontrolü ve oluşturma (boş başlat)
    const reservationsRef = ref(db, "reservations");
    try {
      const reservationsSnapshot = await get(reservationsRef);
      if (!reservationsSnapshot.exists()) {
        await set(reservationsRef, {});
        results.push("Rezervasyonlar başarıyla başlatıldı");
      } else {
        results.push("Rezervasyonlar zaten mevcut, değişiklik yapılmadı");
      }
    } catch (error: any) {
      results.push(`reservations okuma izni hatası: ${error.message}`);
    }

    // User Preferences kontrolü ve oluşturma (boş başlat)
    const userPreferencesRef = ref(db, "user_preferences");
    try {
      const userPreferencesSnapshot = await get(userPreferencesRef);
      if (!userPreferencesSnapshot.exists()) {
        await set(userPreferencesRef, {});
        results.push("Kullanıcı tercihleri başarıyla başlatıldı");
      } else {
        results.push("Kullanıcı tercihleri zaten mevcut, değişiklik yapılmadı");
      }
    } catch (error: any) {
      results.push(`user_preferences okuma izni hatası: ${error.message}`);
    }

    // İzin hatası varsa yardımcı mesaj ekle
    if (results.some((r) => r.includes("izin hatası"))) {
      results.push(" Firebase İzin Hatası Çözümü:");
      results.push(
        "Eğer 'Permission denied' hatası alıyorsanız, Firebase Realtime Database kurallarınızı aşağıdaki gibi güncelleyin:"
      );
      results.push(
        ' { "rules": { ".read": "auth != null", ".write": "auth != null" } } '
      );
      results.push("Bu kuralları uygulamak için şu adımları izleyin:");
      results.push(
        "1. Firebase konsoluna gidin (https://console.firebase.google.com/)"
      );
      results.push("2. Projenizi seçin: reservation-4d834");
      results.push("3. Sol menüden 'Realtime Database' seçin");
      results.push("4. 'Rules' sekmesine tıklayın");
      results.push(
        "5. Yukarıdaki kuralları yapıştırın ve 'Publish' düğmesine tıklayın"
      );
      results.push(
        "Daha ayrıntılı güvenlik kuralları için: https://firebase.google.com/docs/database/security"
      );
    }

    // Next.js 13+ için doğru yanıt formatı
    return new Response(
      JSON.stringify({
        success: true,
        message: "Veritabanı başlatma işlemi tamamlandı",
        results,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Veritabanı başlatma hatası:", error);

    // Hata durumunda yanıt
    return new Response(
      JSON.stringify({
        success: false,
        message: "Veritabanı başlatma sırasında bir hata oluştu",
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
