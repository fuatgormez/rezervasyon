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

export async function POST() {
  try {
    console.log("🔄 Firebase Realtime Database başlatılıyor...");

    // Firebase için özel bir instance oluştur (server-side)
    const app = initializeApp(firebaseConfig, "init-db-post-server");
    const db = getDatabase(app);

    // Kategoriler için demo data
    const categoriesData = {
      // Bebek Boğaziçi kategorileri
      "-OSVBo0LgI-kgRDndQiT": {
        name: "İç Mekan",
        color: "#ef4444",
        restaurantId: "bebek-bogazici",
        createdAt: new Date().toISOString(),
      },
      "-OSVBo0LgI-kgRDndQiU": {
        name: "Bahçe",
        color: "#22c55e",
        restaurantId: "bebek-bogazici",
        createdAt: new Date().toISOString(),
      },
      "-OSVBo0LgI-kgRDndQiV": {
        name: "Teras",
        color: "#3b82f6",
        restaurantId: "bebek-bogazici",
        createdAt: new Date().toISOString(),
      },
      // Etiler Şubesi kategorileri
      "-OSVBo0LgI-kgRDndQiW": {
        name: "Ana Salon",
        color: "#8b5cf6",
        restaurantId: "etiler-branch",
        createdAt: new Date().toISOString(),
      },
      "-OSVBo0LgI-kgRDndQiX": {
        name: "VIP Bölüm",
        color: "#f59e0b",
        restaurantId: "etiler-branch",
        createdAt: new Date().toISOString(),
      },
      "-OSVBo0LgI-kgRDndQiY": {
        name: "Cam Balkon",
        color: "#06b6d4",
        restaurantId: "etiler-branch",
        createdAt: new Date().toISOString(),
      },
    };

    // Demo müşteriler
    const customersData = {
      "customer-1": {
        name: "Ahmet Yılmaz",
        email: "ahmet@example.com",
        phone: "+905551234567",
        address: "Bebek, İstanbul",
        notes: "VIP müşteri, pencere kenarı masayı tercih eder",
        restaurantId: "bebek-bogazici",
        reservationCount: 5,
        loyaltyPoints: 50,
        firstReservationDate: "2024-01-15T10:00:00.000Z",
        lastReservationDate: "2024-12-01T19:30:00.000Z",
        createdAt: "2024-01-15T10:00:00.000Z",
      },
      "customer-2": {
        name: "Elif Kaya",
        email: "elif@example.com",
        phone: "+905559876543",
        address: "Etiler, İstanbul",
        notes: "Vejeteryan yemek tercih eder",
        restaurantId: "bebek-bogazici",
        reservationCount: 3,
        loyaltyPoints: 30,
        firstReservationDate: "2024-02-20T14:00:00.000Z",
        lastReservationDate: "2024-11-15T20:00:00.000Z",
        createdAt: "2024-02-20T14:00:00.000Z",
      },
      "customer-3": {
        name: "Mehmet Öz",
        email: "mehmet@example.com",
        phone: "+905557654321",
        address: "Beşiktaş, İstanbul",
        notes: "Büyük grup rezervasyonları yapar",
        restaurantId: "etiler-branch",
        reservationCount: 8,
        loyaltyPoints: 80,
        firstReservationDate: "2023-12-10T12:00:00.000Z",
        lastReservationDate: "2024-12-05T18:45:00.000Z",
        createdAt: "2023-12-10T12:00:00.000Z",
      },
      "customer-4": {
        name: "Zeynep Demir",
        email: "zeynep@example.com",
        phone: "+905558887766",
        address: "Nişantaşı, İstanbul",
        notes: "Balık yemekleri sever",
        restaurantId: "etiler-branch",
        reservationCount: 2,
        loyaltyPoints: 20,
        firstReservationDate: "2024-03-10T13:00:00.000Z",
        lastReservationDate: "2024-11-20T19:00:00.000Z",
        createdAt: "2024-03-10T13:00:00.000Z",
      },
    };

    // Demo garsonlar
    const waitersData = {
      // Bebek Boğaziçi garsonları
      "waiter-1": {
        name: "Ali Demir",
        email: "ali@tamerrestoran.com",
        phone: "+905551111111",
        restaurantId: "bebek-bogazici",
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      "waiter-2": {
        name: "Ayşe Şahin",
        email: "ayse@tamerrestoran.com",
        phone: "+905552222222",
        restaurantId: "bebek-bogazici",
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      // Etiler Şubesi garsonları
      "waiter-3": {
        name: "Emre Yılmaz",
        email: "emre@tamerrestoran.com",
        phone: "+905553333333",
        restaurantId: "etiler-branch",
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      "waiter-4": {
        name: "Selin Kaya",
        email: "selin@tamerrestoran.com",
        phone: "+905554444444",
        restaurantId: "etiler-branch",
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    };

    // Mevcut firma verilerini kontrol et
    const companiesRef = ref(db, "companies");
    const companiesSnapshot = await get(companiesRef);

    let companiesData = {};
    if (companiesSnapshot.exists()) {
      companiesData = companiesSnapshot.val();
      console.log(
        "✅ Mevcut firma verileri kullanılıyor:",
        Object.keys(companiesData).length,
        "firma"
      );
    } else {
      // Eğer hiç firma yoksa demo firma ekle
      companiesData = {
        "demo-company": {
          name: "Demo Restoran Grubu",
          email: "demo@example.com",
          phone: "+902129876543",
          address: "İstanbul",
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      };
      console.log("⚠️ Demo firma oluşturuldu");
    }

    // Mevcut restoran verilerini kontrol et
    const restaurantsRef = ref(db, "restaurants");
    const restaurantsSnapshot = await get(restaurantsRef);

    let restaurantsData = {};
    if (restaurantsSnapshot.exists()) {
      restaurantsData = restaurantsSnapshot.val();
      console.log(
        "✅ Mevcut restoran verileri kullanılıyor:",
        Object.keys(restaurantsData).length,
        "restoran"
      );
    } else {
      // Eğer hiç restoran yoksa demo restoran ekle
      const firstCompanyId = Object.keys(companiesData)[0];
      restaurantsData = {
        "demo-restaurant": {
          name: "Demo Restoran",
          companyId: firstCompanyId,
          address: "Demo Adres, İstanbul",
          phone: "+902123333333",
          email: "demo@restaurant.com",
          capacity: 80,
          openingTime: "08:00",
          closingTime: "01:00",
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      };
      console.log("⚠️ Demo restoran oluşturuldu");
    }

    // Mevcut masa verilerini kontrol et
    const tablesRef = ref(db, "tables");
    const tablesSnapshot = await get(tablesRef);

    let tablesData = {};
    if (tablesSnapshot.exists()) {
      tablesData = tablesSnapshot.val();
      console.log(
        "✅ Mevcut masa verileri kullanılıyor:",
        Object.keys(tablesData).length,
        "masa"
      );
    } else {
      // Eğer hiç masa yoksa demo masalar ekle
      const firstRestaurantId = Object.keys(restaurantsData)[0];
      const firstCategoryId = Object.keys(categoriesData)[0];

      tablesData = {
        "demo-table-1": {
          number: 1,
          tableName: "Ana Salon Masa",
          minCapacity: 2,
          maxCapacity: 4,
          capacity: 4,
          category_id: firstCategoryId,
          restaurantId: firstRestaurantId,
          isAvailableForCustomers: true,
          description: "Standart masa - müşteri rezervasyonuna açık",
          status: "active",
          createdAt: new Date().toISOString(),
        },
        "demo-table-2": {
          number: 2,
          tableName: "VIP Masa",
          minCapacity: 2,
          maxCapacity: 6,
          capacity: 6,
          category_id: firstCategoryId,
          restaurantId: firstRestaurantId,
          isAvailableForCustomers: false, // Sadece admin rezervasyonu
          description:
            "VIP masa - sadece yönetici panelinden rezerve edilebilir",
          status: "active",
          createdAt: new Date().toISOString(),
        },
      };
      console.log("⚠️ Demo masalar oluşturuldu");
    }

    // Sadece eksik verileri Firebase'e kaydet
    if (!companiesSnapshot.exists()) {
      await set(ref(db, "companies"), companiesData);
    }
    if (!restaurantsSnapshot.exists()) {
      await set(ref(db, "restaurants"), restaurantsData);
    }
    if (!tablesSnapshot.exists()) {
      await set(ref(db, "tables"), tablesData);
    }

    // Kategoriler, müşteriler ve garsonlar her zaman güncellenir (demo data)
    await set(ref(db, "categories"), categoriesData);
    await set(ref(db, "customers"), customersData);
    await set(ref(db, "waiters"), waitersData);

    console.log("✅ Firebase Realtime Database başarıyla başlatıldı!");

    return NextResponse.json({
      success: true,
      message: "Firebase Realtime Database başarıyla başlatıldı!",
      data: {
        categories: Object.keys(categoriesData).length,
        customers: Object.keys(customersData).length,
        waiters: Object.keys(waitersData).length,
        companies: Object.keys(companiesData).length,
        restaurants: Object.keys(restaurantsData).length,
        tables: Object.keys(tablesData).length,
      },
    });
  } catch (error: any) {
    console.error("❌ Firebase Realtime Database başlatma hatası:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Firebase Realtime Database başlatma hatası",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
