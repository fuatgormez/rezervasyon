"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { ref, get, child } from "firebase/database";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Firebase ile giriş yap
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Kullanıcı bilgilerini Realtime Database'den al
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, `users/${user.uid}`));

      if (!snapshot.exists()) {
        throw new Error("Kullanıcı bilgileri bulunamadı!");
      }

      const userData = snapshot.val();

      // Admin kontrolü yap
      if (!userData.is_super_admin) {
        throw new Error("Bu sayfaya erişim yetkiniz yok!");
      }

      // Başarılı giriş sonrası yönlendirme
      router.push("/admin");
      router.refresh();
    } catch (error: any) {
      let errorMessage = "Giriş yapılırken bir hata oluştu.";

      if (error.code === "auth/user-not-found") {
        errorMessage = "Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı.";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Hatalı şifre girdiniz.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Geçersiz e-posta adresi.";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage =
          "Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8 bg-gray-800 rounded-lg shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Süper Admin Girişi
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-500 text-white px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                E-posta
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-500 text-white bg-gray-700 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="E-posta adresi"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Şifre
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-500 text-white bg-gray-700 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Şifre"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Giriş Yap
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
