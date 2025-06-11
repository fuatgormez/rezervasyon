"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/config/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function CompanyLoginPage() {
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

      // Kullanıcı bilgilerini Firestore'dan al
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        throw new Error("Kullanıcı bilgileri bulunamadı!");
      }

      const userData = userDoc.data();

      // Firma yöneticisi kontrolü yap
      if (userData.role !== "company_admin") {
        throw new Error("Bu sayfaya erişim yetkiniz yok!");
      }

      // Başarılı giriş sonrası yönlendirme
      router.push("/company/dashboard");
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Firma Yönetici Girişi
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
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
