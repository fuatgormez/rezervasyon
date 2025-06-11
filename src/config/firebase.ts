"use client";

// Bu dosya lib/firebase/config.ts'ye yönlendirme yapar
// Tek bir Firebase yapılandırması kullanmak için
import app, {
  auth,
  db,
  storage,
  checkFirebaseConnection,
} from "@/lib/firebase/config";

export { app as default, auth, db, storage, checkFirebaseConnection };
