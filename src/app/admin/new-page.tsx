"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Gerçek içerik bileşeni - bu client tarafında lazy load edilecek
const AdminContent = dynamic(() => import("@/components/admin/AdminContent"), {
  ssr: false,
  loading: () => <div className="p-8">Yükleniyor...</div>,
});

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">
            Rezervasyon Yönetimi
          </h1>

          <nav className="flex space-x-4">
            <Link
              href="/admin"
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/settings"
              className="px-3 py-2 rounded-lg hover:bg-gray-100"
            >
              Ayarlar
            </Link>
            <Link
              href="/admin/tables"
              className="px-3 py-2 rounded-lg hover:bg-gray-100"
            >
              Masalar
            </Link>
            <Link
              href="/init-db"
              className="px-3 py-2 rounded-lg hover:bg-gray-100"
            >
              Veritabanı
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {/* Admin içeriği burada gösterilecek */}
          <AdminContent />
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
          Rezervasyon Yönetim Sistemi &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
