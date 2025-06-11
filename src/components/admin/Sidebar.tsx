"use client";

import Link from "next/link";
import { useAuthContext } from "@/lib/firebase";

interface SidebarProps {
  pathname: string;
  showMobileMenu: boolean;
  setShowMobileMenu: (show: boolean) => void;
}

export default function AdminSidebar({
  pathname,
  showMobileMenu,
  setShowMobileMenu,
}: SidebarProps) {
  const { logout } = useAuthContext();

  const handleLogout = async () => {
    try {
      await logout();
      // Çıkış başarılı, login sayfasına yönlendirme Next.js useEffect içinde yapılacak
    } catch (error) {
      console.error("Çıkış yapılırken hata oluştu:", error);
    }
  };

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity md:hidden"
          onClick={() => setShowMobileMenu(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-gray-800 transition duration-300 ease-in-out md:relative md:translate-x-0 ${
          showMobileMenu ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col overflow-y-auto">
          <div className="flex items-center justify-center h-16 bg-gray-900">
            <span className="text-white text-xl font-semibold">
              Rezervasyon Panel
            </span>
          </div>

          <nav className="mt-5 px-2 space-y-1">
            {/* Ana Sayfa */}
            <Link href="/admin">
              <div
                className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                  pathname === "/admin"
                    ? "bg-gray-900 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                <svg
                  className="mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-300"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Ana Sayfa
              </div>
            </Link>

            {/* Basit Panel */}
            <Link href="/admin/simple-dashboard">
              <div
                className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                  pathname === "/admin/simple-dashboard"
                    ? "bg-gray-900 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                <svg
                  className="mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-300"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                Basit Panel
              </div>
            </Link>

            {/* Masalar */}
            <Link href="/admin/tables">
              <div
                className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                  pathname === "/admin/tables"
                    ? "bg-gray-900 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                <svg
                  className="mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-300"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
                Masalar
              </div>
            </Link>

            {/* Ayarlar */}
            <Link href="/admin/settings">
              <div
                className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                  pathname === "/admin/settings"
                    ? "bg-gray-900 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                <svg
                  className="mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-300"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Ayarlar
              </div>
            </Link>

            {/* Veritabanı Başlat */}
            <Link href="/init-db">
              <div
                className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                  pathname === "/init-db"
                    ? "bg-gray-900 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                <svg
                  className="mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-300"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                  />
                </svg>
                Veritabanı Başlat
              </div>
            </Link>

            {/* Süper Admin Oluştur */}
            <Link href="/init-user">
              <div
                className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                  pathname === "/init-user"
                    ? "bg-gray-900 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                <svg
                  className="mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-300"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
                Süper Admin Oluştur
              </div>
            </Link>
          </nav>

          <div className="mt-auto p-4">
            <button
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded transition-colors duration-200"
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
