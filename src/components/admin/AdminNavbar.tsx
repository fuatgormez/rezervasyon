// src/components/admin/AdminNavbar.tsx
// Orijinal: RezervasyonPaneli.tsx'in navbar kısmı
// Açıklama: Admin paneli üst menü componenti. Navigasyon ve çıkış işlemleri burada.

import Link from "next/link";
import { LogOut } from "lucide-react";

export default function AdminNavbar() {
  return (
    <div className="flex justify-between items-center bg-white p-4 border-b border-gray-200 shadow-sm">
      <div className="flex items-center space-x-6">
        <div className="text-2xl font-bold text-blue-600">
          Rezervasyon Yönetimi
        </div>
        <div className="flex space-x-4">
          <Link
            href="/admin"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Dashboard
          </Link>
          <Link
            href="/admin/settings"
            className="px-4 py-2 rounded-lg hover:bg-gray-100"
          >
            Sistem Ayarları
          </Link>
          <Link
            href="/admin/staff"
            className="px-4 py-2 rounded-lg hover:bg-gray-100"
          >
            Garson Yönetimi
          </Link>
          <Link
            href="/admin/customers"
            className="px-4 py-2 rounded-lg hover:bg-gray-100"
          >
            Müşteri Yönetimi
          </Link>
          <Link
            href="/reservation"
            className="px-4 py-2 rounded-lg hover:bg-gray-100"
          >
            Rezervasyon
          </Link>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <Link
          href="/init-db"
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Veritabanı Başlat
        </Link>
        <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-1">
          <LogOut className="w-4 h-4" />
          <span>Çıkış</span>
        </button>
      </div>
    </div>
  );
}
