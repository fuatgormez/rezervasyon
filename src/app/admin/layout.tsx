"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuthContext } from "@/lib/firebase";
import AdminSidebar from "@/components/admin/Sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userProfile, loading } = useAuthContext();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Auth kontrolü
  useEffect(() => {
    if (!loading && !user) {
      router.push("/admin/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar
        pathname={pathname}
        showMobileMenu={showMobileMenu}
        setShowMobileMenu={setShowMobileMenu}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="text-gray-500 focus:outline-none md:hidden"
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

              <div className="ml-4 hidden md:flex items-baseline space-x-2">
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
              </div>
            </div>

            <div className="flex items-center">
              <span className="text-sm text-gray-600 mr-2">
                {userProfile?.name || "Admin"}
              </span>
              <img
                className="h-8 w-8 rounded-full object-cover"
                src="/images/avatar-placeholder.png"
                alt="User avatar"
              />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-gray-50">{children}</main>
      </div>
    </div>
  );
}
