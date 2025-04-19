// Veritabanı temizleme script'i
// Bu script, test için oluşturulmuş tüm rezervasyonları siler

import { kv } from "@vercel/kv";
import dotenv from "dotenv";

// .env dosyasını yükle
dotenv.config();

/**
 * Veritabanındaki tüm rezervasyonları ve ilgili indeksleri temizler
 */
async function clearDatabase() {
  console.log("Veritabanı temizleme işlemi başlatılıyor...");

  try {
    // Tüm rezervasyonları temizle
    const reservationKeys = await kv.keys("reservation:*");
    console.log(`${reservationKeys.length} rezervasyon bulundu.`);

    if (reservationKeys.length > 0) {
      await Promise.all(reservationKeys.map((key) => kv.del(key)));
      console.log(`${reservationKeys.length} rezervasyon silindi.`);
    }

    // Tüm masa rezervasyon indekslerini temizle
    const tableIndices = await kv.keys("table:reservation:*");
    console.log(`${tableIndices.length} masa rezervasyon indeksi bulundu.`);

    if (tableIndices.length > 0) {
      await Promise.all(tableIndices.map((key) => kv.del(key)));
      console.log(`${tableIndices.length} masa rezervasyon indeksi silindi.`);
    }

    // Tüm tarih rezervasyon indekslerini temizle
    const dateIndices = await kv.keys("date:reservation:*");
    console.log(`${dateIndices.length} tarih rezervasyon indeksi bulundu.`);

    if (dateIndices.length > 0) {
      await Promise.all(dateIndices.map((key) => kv.del(key)));
      console.log(`${dateIndices.length} tarih rezervasyon indeksi silindi.`);
    }

    console.log("Veritabanı temizleme işlemi tamamlandı.");
  } catch (error) {
    console.error("Veritabanı temizleme sırasında hata oluştu:", error);
  }
}

// Script doğrudan çalıştırıldığında veritabanını temizle
clearDatabase();
