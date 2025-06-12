"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuthContext } from "@/lib/firebase";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userProfile, loading, logout } = useAuthContext();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Auth kontrolü
  useEffect(() => {
    if (!loading && !user) {
      router.push("/admin/login");
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    try {
      await logout();
      // Çıkış başarılı, login sayfasına yönlendirme Next.js useEffect içinde yapılacak
    } catch (error) {
      console.error("Çıkış yapılırken hata oluştu:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center">
              <Link href="/admin">
                <div className="text-xl font-bold text-blue-600">
                  Rezervasyon Panel
                </div>
              </Link>
            </div>

            {/* Desktop Menü */}
            <div className="hidden md:flex items-center space-x-2">
              <Link href="/admin">
                <div
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === "/admin"
                      ? "bg-blue-500 text-white"
                      : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                  }`}
                >
                  Ana Sayfa
                </div>
              </Link>
              <Link href="/admin/settings">
                <div
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === "/admin/settings"
                      ? "bg-blue-500 text-white"
                      : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                  }`}
                >
                  Ayarlar
                </div>
              </Link>
              <Link href="/admin/tables">
                <div
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === "/admin/tables"
                      ? "bg-blue-500 text-white"
                      : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                  }`}
                >
                  Masalar
                </div>
              </Link>
              <Link href="/admin/simple-dashboard">
                <div
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === "/admin/simple-dashboard"
                      ? "bg-blue-500 text-white"
                      : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                  }`}
                >
                  Basit Panel
                </div>
              </Link>
              <Link href="/init-db">
                <div
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === "/init-db"
                      ? "bg-blue-500 text-white"
                      : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                  }`}
                >
                  Veritabanı Başlat
                </div>
              </Link>
              <Link href="/init-user">
                <div
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === "/init-user"
                      ? "bg-blue-500 text-white"
                      : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                  }`}
                >
                  Süper Admin
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="ml-2 px-3 py-2 bg-red-500 text-white rounded-md text-sm font-medium hover:bg-red-600"
              >
                Çıkış
              </button>
            </div>

            {/* Mobil menü düğmesi */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="text-gray-500 focus:outline-none"
              >
                <svg
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4 6H20M4 12H20M4 18H20"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <span className="text-sm text-gray-600 ml-2">
                {userProfile?.name || "Admin"}
              </span>
            </div>
          </div>

          {/* Mobil Menü */}
          {showMobileMenu && (
            <div className="md:hidden py-2 border-t border-gray-200">
              <Link href="/admin">
                <div
                  className={`block px-4 py-2 rounded-md text-base font-medium ${
                    pathname === "/admin"
                      ? "bg-blue-500 text-white"
                      : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                  }`}
                >
                  Ana Sayfa
                </div>
              </Link>
              <Link href="/admin/settings">
                <div
                  className={`block px-4 py-2 rounded-md text-base font-medium ${
                    pathname === "/admin/settings"
                      ? "bg-blue-500 text-white"
                      : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                  }`}
                >
                  Ayarlar
                </div>
              </Link>
              <Link href="/admin/tables">
                <div
                  className={`block px-4 py-2 rounded-md text-base font-medium ${
                    pathname === "/admin/tables"
                      ? "bg-blue-500 text-white"
                      : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                  }`}
                >
                  Masalar
                </div>
              </Link>
              <Link href="/admin/simple-dashboard">
                <div
                  className={`block px-4 py-2 rounded-md text-base font-medium ${
                    pathname === "/admin/simple-dashboard"
                      ? "bg-blue-500 text-white"
                      : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                  }`}
                >
                  Basit Panel
                </div>
              </Link>
              <Link href="/init-db">
                <div
                  className={`block px-4 py-2 rounded-md text-base font-medium ${
                    pathname === "/init-db"
                      ? "bg-blue-500 text-white"
                      : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                  }`}
                >
                  Veritabanı Başlat
                </div>
              </Link>
              <Link href="/init-user">
                <div
                  className={`block px-4 py-2 rounded-md text-base font-medium ${
                    pathname === "/init-user"
                      ? "bg-blue-500 text-white"
                      : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                  }`}
                >
                  Süper Admin
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 mt-2 bg-red-500 text-white rounded-md text-base font-medium hover:bg-red-600"
              >
                Çıkış Yap
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-gray-50 p-4">{children}</main>
    </div>
  );
}
