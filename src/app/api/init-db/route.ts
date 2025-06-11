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
import { mockTableCategories, mockTables } from "@/models/tables";

// API'nin dinamik olarak çalışmasını sağlar (önbellekleme yok)
export const dynamic = "force-dynamic";

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

// Veritabanını başlatmak için API endpoint
export async function GET() {
  try {
    console.log("Veritabanı başlatılıyor...");

    // Firebase uygulamasını başlat
    const app = initializeApp(firebaseConfig, "init-db-api");
    const db = getDatabase(app);

    // Gerekli koleksiyonlar
    const collections = [
      { name: "settings", id: "app_settings" },
      { name: "tables", useAutoId: true },
      { name: "table_categories", useAutoId: true },
      { name: "reservations", useAutoId: true },
      { name: "user_preferences", useAutoId: true },
    ];

    const results = [];

    // Koleksiyonları oluştur
    for (const col of collections) {
      try {
        if (col.name === "settings" && col.id) {
          // Settings için sabit ID kullan
          const settingsRef = ref(db, `${col.name}/${col.id}`);

          // Varsayılan ayarları oluştur
          const defaultSettings = {
            company: {
              name: "Rezervasyon Sistemi",
              logo: "/logo.png",
              phone: "+90 555 123 45 67",
              address: "İstanbul, Türkiye",
              email: "info@rezervasyon.com",
            },
            working_hours: {
              opening: "07:00",
              closing: "02:00",
            },
            reservation_duration: 120,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          await set(settingsRef, defaultSettings);
          results.push(`${col.name} koleksiyonu oluşturuldu`);
        } else if (col.name === "table_categories") {
          // Örnek masa kategorileri oluştur
          const categoriesRef = ref(db, col.name);
          const snapshot = await get(categoriesRef);

          // Eğer koleksiyon boşsa örnek veriler ekle
          if (!snapshot.exists()) {
            for (const category of mockTableCategories) {
              const newCategoryRef = push(categoriesRef);
              await set(newCategoryRef, {
                name: category.name,
                color: category.color,
                borderColor: category.border_color,
                backgroundColor: category.background_color,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
            }
            results.push(`${col.name} koleksiyonu örnek verilerle oluşturuldu`);
          } else {
            results.push(`${col.name} koleksiyonu zaten mevcut`);
          }
        } else if (col.name === "tables") {
          // Örnek masalar oluştur
          const tablesRef = ref(db, col.name);
          const snapshot = await get(tablesRef);

          // Eğer koleksiyon boşsa örnek veriler ekle
          if (!snapshot.exists()) {
            for (const table of mockTables) {
              const newTableRef = push(tablesRef);
              await set(newTableRef, {
                number: table.number,
                capacity: table.capacity,
                category_id: table.category_id,
                status: table.status,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
            }
            results.push(`${col.name} koleksiyonu örnek verilerle oluşturuldu`);
          } else {
            results.push(`${col.name} koleksiyonu zaten mevcut`);
          }
        } else if (col.useAutoId) {
          // Boş bir doküman ekleyerek koleksiyonu oluştur
          const colRef = ref(db, col.name);
          const snapshot = await get(colRef);

          // Eğer koleksiyon boşsa örnek bir doküman ekle
          if (!snapshot.exists()) {
            const newDocRef = push(colRef);
            await set(newDocRef, {
              name: "Örnek Doküman",
              description:
                "Bu doküman koleksiyonu oluşturmak için eklenmiştir.",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            results.push(`${col.name} koleksiyonu oluşturuldu`);
          } else {
            results.push(`${col.name} koleksiyonu zaten mevcut`);
          }
        }
      } catch (error) {
        console.error(`${col.name} koleksiyonu oluşturulurken hata:`, error);
        results.push(
          `${col.name} koleksiyonu oluşturulurken hata: ${
            error instanceof Error ? error.message : "Bilinmeyen hata"
          }`
        );
      }
    }

    const responseData = {
      success: true,
      message: "Veritabanı başlatma işlemi tamamlandı",
      results,
    };

    console.log("API yanıtı:", responseData);

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Veritabanı başlatılırken hata:", error);
    const errorResponse = {
      success: false,
      error:
        error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu",
    };

    console.log("Hata yanıtı:", errorResponse);

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  }
}
