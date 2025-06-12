import { NextResponse } from "next/server";
import { db } from "@/lib/firebase/config";
import { ref, remove, get } from "firebase/database";
import { getAuth, deleteUser } from "firebase/auth";
import { initializeApp } from "firebase/app";

// API'nin dinamik olarak çalışmasını sağlar (önbellekleme yok)
export const dynamic = "force-dynamic";

export async function DELETE(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Kullanıcı ID'si gereklidir" },
        { status: 400 }
      );
    }

    // Firebase Realtime Database'deki kullanıcı profilini sil
    const userRef = ref(db, `users/${userId}`);

    // Kullanıcı var mı kontrol et
    const snapshot = await get(userRef);
    if (!snapshot.exists()) {
      return NextResponse.json(
        { success: false, message: "Kullanıcı bulunamadı" },
        { status: 404 }
      );
    }

    // Profil bilgilerini sil
    await remove(userRef);

    // NOT: Firebase Auth'da kullanıcı silme işlemi, admin SDK veya
    // kullanıcının kendi kimlik doğrulama token'ı gerektirir.
    // Bu sadece Realtime Database'deki profil verilerini siler.
    // Tam silme için ek bir işlem gereklidir.

    return NextResponse.json({
      success: true,
      message: "Kullanıcı başarıyla silindi",
    });
  } catch (error: any) {
    console.error("Kullanıcı silme hatası:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Kullanıcı silinirken bir hata oluştu",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
