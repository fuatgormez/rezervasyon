"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { verifyJWTToken } from "@/lib/jwt";
import Cookies from "js-cookie";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Auth kontrolü - JWT token ile
  useEffect(() => {
    const checkAuth = () => {
      if (typeof window === "undefined") return;

      const token = Cookies.get("auth-token");

      if (token) {
        const decoded = verifyJWTToken(token);
        if (decoded) {
          // Login redirect guard'ını temizle
          localStorage.removeItem("login-redirect-guard");
          setIsAuthenticated(true);
          return;
        } else {
          // Geçersiz token'ı temizle
          Cookies.remove("auth-token");
          localStorage.removeItem("auth-token");
          sessionStorage.removeItem("auth-token");
        }
      }

      setIsAuthenticated(false);
      router.replace("/login");
    };

    checkAuth();
  }, [router]);

  // Loading durumu
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Authenticated değilse zaten yönlendirme yapılmış
  if (!isAuthenticated) {
    return null;
  }

  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
