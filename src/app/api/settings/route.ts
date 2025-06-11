import { NextRequest, NextResponse } from "next/server";
import { db } from "@/config/firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";

// Ayarlar için koleksiyon ve belge ID'si
const SETTINGS_DOC_ID = "system_settings";

// GET - Sistem ayarlarını getir
export async function GET() {
  try {
    const settingsRef = doc(db, "settings", SETTINGS_DOC_ID);
    const settingsSnap = await getDoc(settingsRef);

    if (!settingsSnap.exists()) {
      // Ayarlar bulunamadıysa varsayılan ayarları oluştur
      const defaultSettings = {
        workingHours: {
          start: "09:00",
          end: "23:00",
        },
        minPayment: 0,
        isSystemActive: true,
        createdAt: new Date().toISOString(),
      };

      await setDoc(settingsRef, defaultSettings);
      return NextResponse.json(defaultSettings);
    }

    return NextResponse.json(settingsSnap.data());
  } catch (error) {
    console.error("Ayarlar getirilirken hata:", error);
    return NextResponse.json(
      { error: "Ayarlar getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// POST - Sistem ayarlarını güncelle
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // Zorunlu alanları kontrol et
    if (
      !data.workingHours ||
      data.minPayment === undefined ||
      data.isSystemActive === undefined
    ) {
      return NextResponse.json(
        {
          error: "Çalışma saatleri, minimum ödeme ve sistem durumu gereklidir",
        },
        { status: 400 }
      );
    }

    // Ayarları güncelle
    const settingsRef = doc(db, "settings", SETTINGS_DOC_ID);

    // Güncelleme zamanını ekle
    const updatedData = {
      ...data,
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(settingsRef, updatedData);

    // Güncel ayarları getir
    const updatedSettingsSnap = await getDoc(settingsRef);

    return NextResponse.json(updatedSettingsSnap.data(), { status: 200 });
  } catch (error) {
    console.error("Ayarlar güncellenirken hata:", error);
    return NextResponse.json(
      { error: "Ayarlar güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
