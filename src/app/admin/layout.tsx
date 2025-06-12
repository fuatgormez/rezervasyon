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
      console.error("Çıkış yapılırken hata:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white shadow-sm z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/admin" className="text-xl font-bold text-blue-600">
              Rezervasyon
            </Link>

            <nav className="hidden md:flex items-center gap-4 ml-6 text-sm">
              <Link
                href="/admin/dashboard"
                className={`${
                  pathname?.includes("/admin/dashboard")
                    ? "font-bold text-blue-600"
                    : "text-gray-600 hover:text-blue-500"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/admin"
                className={`${
                  pathname === "/admin"
                    ? "font-bold text-blue-600"
                    : "text-gray-600 hover:text-blue-500"
                }`}
              >
                Rezervasyonlar
              </Link>
              <Link
                href="/admin/tables"
                className={`${
                  pathname?.includes("/admin/tables")
                    ? "font-bold text-blue-600"
                    : "text-gray-600 hover:text-blue-500"
                }`}
              >
                Masalar
              </Link>
              <Link
                href="/admin/settings"
                className={`${
                  pathname?.includes("/admin/settings") &&
                  !pathname?.includes("/admin/settings/users")
                    ? "font-bold text-blue-600"
                    : "text-gray-600 hover:text-blue-500"
                }`}
              >
                Ayarlar
              </Link>
              {userProfile?.role === "admin" ||
              userProfile?.role === "super_admin" ? (
                <Link
                  href="/admin/settings/users"
                  className={`${
                    pathname?.includes("/admin/settings/users")
                      ? "font-bold text-blue-600"
                      : "text-gray-600 hover:text-blue-500"
                  }`}
                >
                  Kullanıcılar
                </Link>
              ) : null}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:block text-sm text-gray-700">
              {userProfile?.name || user?.email || "Kullanıcı"}
              {userProfile?.role && (
                <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-100">
                  {userProfile.role === "super_admin"
                    ? "Süper Admin"
                    : userProfile.role === "admin"
                    ? "Admin"
                    : "Kullanıcı"}
                </span>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Çıkış
            </button>

            {/* Mobil menü butonu */}
            <button
              className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {showMobileMenu ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16m-7 6h7"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobil menü */}
        {showMobileMenu && (
          <div className="md:hidden px-4 pt-2 pb-3 space-y-1 bg-gray-50 border-t">
            <Link
              href="/admin/dashboard"
              className={`block px-3 py-2 rounded-md text-base ${
                pathname?.includes("/admin/dashboard")
                  ? "font-medium text-blue-600 bg-blue-50"
                  : "font-normal text-gray-600 hover:bg-gray-100"
              }`}
              onClick={() => setShowMobileMenu(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/admin"
              className={`block px-3 py-2 rounded-md text-base ${
                pathname === "/admin"
                  ? "font-medium text-blue-600 bg-blue-50"
                  : "font-normal text-gray-600 hover:bg-gray-100"
              }`}
              onClick={() => setShowMobileMenu(false)}
            >
              Rezervasyonlar
            </Link>
            <Link
              href="/admin/tables"
              className={`block px-3 py-2 rounded-md text-base ${
                pathname?.includes("/admin/tables")
                  ? "font-medium text-blue-600 bg-blue-50"
                  : "font-normal text-gray-600 hover:bg-gray-100"
              }`}
              onClick={() => setShowMobileMenu(false)}
            >
              Masalar
            </Link>
            <Link
              href="/admin/settings"
              className={`block px-3 py-2 rounded-md text-base ${
                pathname?.includes("/admin/settings") &&
                !pathname?.includes("/admin/settings/users")
                  ? "font-medium text-blue-600 bg-blue-50"
                  : "font-normal text-gray-600 hover:bg-gray-100"
              }`}
              onClick={() => setShowMobileMenu(false)}
            >
              Ayarlar
            </Link>
            {userProfile?.role === "admin" ||
            userProfile?.role === "super_admin" ? (
              <Link
                href="/admin/settings/users"
                className={`block px-3 py-2 rounded-md text-base ${
                  pathname?.includes("/admin/settings/users")
                    ? "font-medium text-blue-600 bg-blue-50"
                    : "font-normal text-gray-600 hover:bg-gray-100"
                }`}
                onClick={() => setShowMobileMenu(false)}
              >
                Kullanıcılar
              </Link>
            ) : null}
            <div className="pt-2 border-t border-gray-200">
              <div className="px-3 py-2 text-sm text-gray-500">
                {userProfile?.name || user?.email || "Kullanıcı"}
                {userProfile?.role && (
                  <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-200">
                    {userProfile.role === "super_admin"
                      ? "Süper Admin"
                      : userProfile.role === "admin"
                      ? "Admin"
                      : "Kullanıcı"}
                  </span>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="mt-1 block w-full text-left px-3 py-2 text-base text-red-600 hover:bg-gray-100"
              >
                Çıkış
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-auto bg-gray-50 p-4">{children}</main>
    </div>
  );
}
