"use client";

import { useAuth } from "@/lib/firebase/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setLoading(true);
      await logout();
      // Çıkış sonrası sayfayı yenile ve login sayfasına yönlendir
      window.location.href = "/login";
    } catch (error) {
      console.error("Çıkış yapılırken hata oluştu:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    router.push("/login");
  };

  if (!user) {
    return (
      <button
        onClick={handleLogin}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Giriş Yap
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? "Çıkış Yapılıyor..." : "Çıkış Yap"}
    </button>
  );
}
