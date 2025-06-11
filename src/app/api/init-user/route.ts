import { NextResponse } from "next/server";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getDatabase, ref, set } from "firebase/database";

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

// Süper admin bilgileri
const DEFAULT_ADMIN = {
  email: "admin@example.com",
  password: "Admin123!",
  name: "Süper Admin",
  is_super_admin: true,
};

export async function GET(request: Request) {
  try {
    console.log("Süper admin kullanıcısı oluşturuluyor...");

    // Firebase başlatma
    const app = initializeApp(firebaseConfig, { name: "init-user-api" });
    const auth = getAuth(app);
    const db = getDatabase(app);

    // Kullanıcı oluşturma
    let userId;
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        DEFAULT_ADMIN.email,
        DEFAULT_ADMIN.password
      );
      userId = userCredential.user.uid;
      console.log(`Kullanıcı oluşturuldu: ${userId}`);
    } catch (authError: any) {
      // Kullanıcı zaten varsa hata mesajını yakalayıp devam et
      if (authError.code === "auth/email-already-in-use") {
        return new NextResponse(
          JSON.stringify({
            success: false,
            message: "Bu e-posta adresi zaten kullanımda.",
            error: authError.message,
          }),
          { status: 400, headers: { "content-type": "application/json" } }
        );
      }
      throw authError;
    }

    // Kullanıcı profilini veritabanına kaydet
    const userRef = ref(db, `users/${userId}`);
    await set(userRef, {
      name: DEFAULT_ADMIN.name,
      email: DEFAULT_ADMIN.email,
      is_super_admin: DEFAULT_ADMIN.is_super_admin,
      created_at: new Date().toISOString(),
    });

    return new NextResponse(
      JSON.stringify({
        success: true,
        message: "Süper admin kullanıcısı başarıyla oluşturuldu",
        user: {
          id: userId,
          email: DEFAULT_ADMIN.email,
          name: DEFAULT_ADMIN.name,
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Süper admin oluşturma hatası:", error);
    return new NextResponse(
      JSON.stringify({
        success: false,
        message: "Süper admin oluşturulurken bir hata oluştu",
        error: error.message,
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
