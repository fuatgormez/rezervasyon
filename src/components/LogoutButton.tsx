"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/lib/firebase";

interface LogoutButtonProps {
  className?: string;
}

export default function LogoutButton({ className = "" }: LogoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const { logout } = useAuthContext();
  const router = useRouter();

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Çıkış yapılırken hata oluştu:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={`px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${className} ${
        loading ? "opacity-70 cursor-not-allowed" : ""
      }`}
    >
      {loading ? "Çıkış Yapılıyor..." : "Çıkış Yap"}
    </button>
  );
}
