// src/components/admin/AdminHeader.tsx
// Orijinal: RezervasyonPaneli.tsx'in header kısmı
// Açıklama: Tarih, filtre, arama ve yeni rezervasyon butonunu içeren üst component.

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import RestaurantSelector from "../RestaurantSelector";
import { useAuth } from "@/lib/firebase/hooks";

interface AdminHeaderProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode; // Header'ın alt kısmında özel içerik için
}

export default function AdminHeader({
  title,
  subtitle,
  children,
}: AdminHeaderProps) {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      {/* Navbar */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-4">
            <div className="text-2xl font-bold text-blue-600">Zonekult</div>
            <div className="text-sm text-gray-500">Reservation Management</div>
          </div>
          <div className="flex space-x-4">
            <Link
              href="/admin"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Dashboard
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
          <RestaurantSelector />
          <Link
            href="/admin/settings"
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-800"
            title="Sistem Ayarları"
          >
            <Settings className="w-7 h-7" />
          </Link>
          <Link
            href="/init-db"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Veritabanı Başlat
          </Link>

          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-1"
          >
            <LogOut className="w-4 h-4" />
            <span>Çıkış</span>
          </button>
        </div>
      </div>

      {/* Header Content */}
      {(title || subtitle || children) && (
        <div className="p-4">
          {(title || subtitle) && (
            <div className="mb-4">
              {title && (
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              )}
              {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
