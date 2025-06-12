import { NextResponse } from "next/server";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getDatabase, ref, set } from "firebase/database";
import { auth as adminAuth } from "@/lib/firebase/config";
import { db } from "@/lib/firebase/config";

// API'nin dinamik olarak çalışmasını sağlar (önbellekleme yok)
export const dynamic = "force-dynamic";

// Kullanıcı oluşturma API'si
export async function POST(request: Request) {
  try {
    const { email, password, name, role } = await request.json();

    // Gerekli alanların kontrolü
    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, message: "E-posta, şifre ve isim gereklidir" },
        { status: 400 }
      );
    }

    // Kullanıcı oluşturma
    let userId;
    try {
      // Firebase Auth kullanıcı oluşturma
      const userCredential = await createUserWithEmailAndPassword(
        adminAuth,
        email,
        password
      );
      userId = userCredential.user.uid;
    } catch (authError: any) {
      // Kullanıcı zaten varsa hata mesajını yakalayıp devam et
      if (authError.code === "auth/email-already-in-use") {
        return NextResponse.json(
          { success: false, message: "Bu e-posta adresi zaten kullanımda" },
          { status: 400 }
        );
      }
      throw authError;
    }

    // Kullanıcı profilini veritabanına kaydet
    const userRef = ref(db, `users/${userId}`);
    await set(userRef, {
      name,
      email,
      role: role || "user",
      is_super_admin: role === "super_admin", // Geriye dönük uyumluluk için
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Kullanıcı başarıyla oluşturuldu",
      user: {
        id: userId,
        email,
        name,
        role: role || "user",
      },
    });
  } catch (error: any) {
    console.error("Kullanıcı oluşturma hatası:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Kullanıcı oluşturulurken bir hata oluştu",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
