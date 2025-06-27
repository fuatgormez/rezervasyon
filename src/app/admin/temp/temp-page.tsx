"use client";

import Link from "next/link";
import { useState } from "react";

// Basit versiyon
export default function AdminPage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-blue-600 mb-4">
        Rezervasyon Yönetimi
      </h1>

      <div className="flex space-x-4 mb-6">
        <Link
          href="/admin/dashboard"
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
          href="/reservation"
          className="px-4 py-2 rounded-lg hover:bg-gray-100"
        >
          Rezervasyon
        </Link>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Geçici Admin Sayfası</h2>
        <p className="text-gray-600 mb-4">
          Bu sayfa geçici olarak basitleştirilmiştir. Daha sonra tam versiyon
          eklenecektir.
        </p>

        <div className="mt-6">
          <h3 className="font-medium mb-3">Hızlı Bağlantılar:</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <Link href="/init-db" className="text-blue-600 hover:underline">
                Veritabanı Başlat
              </Link>
            </li>
            <li>
              <Link
                href="/admin/settings"
                className="text-blue-600 hover:underline"
              >
                Sistem Ayarları
              </Link>
            </li>
            <li>
              <Link
                href="/admin/tables"
                className="text-blue-600 hover:underline"
              >
                Masa Yönetimi
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
