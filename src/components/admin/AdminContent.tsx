"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase/config";
import { ref, get, onValue } from "firebase/database";
import toast from "react-hot-toast";

export default function AdminContent() {
  const [categories, setCategories] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Firebase'den verileri yükle
    const loadData = async () => {
      try {
        setLoading(true);

        // Kategorileri yükle
        const categoriesRef = ref(db, "table_categories");
        const categoriesSnapshot = await get(categoriesRef);

        if (categoriesSnapshot.exists()) {
          const categoriesData = categoriesSnapshot.val();
          const loadedCategories = Object.entries(categoriesData).map(
            ([id, data]: [string, any]) => ({
              id,
              name: data.name,
              color: data.color || "#4f46e5",
            })
          );
          setCategories(loadedCategories);
        }

        // Masaları yükle
        const tablesRef = ref(db, "tables");
        const tablesSnapshot = await get(tablesRef);

        if (tablesSnapshot.exists()) {
          const tablesData = tablesSnapshot.val();
          const loadedTables = Object.entries(tablesData).map(
            ([id, data]: [string, any]) => ({
              id,
              number: data.number || parseInt(id.replace("table", "")) || 0,
              capacity: data.capacity || 2,
              category: data.category || "salon",
              isActive: data.isActive !== false, // Varsayılan olarak aktif
            })
          );
          setTables(loadedTables);
        }

        // Rezervasyonları yükle
        const reservationsRef = ref(db, "reservations");
        onValue(reservationsRef, (snapshot) => {
          if (snapshot.exists()) {
            const reservationsData = snapshot.val();
            const loadedReservations = Object.entries(reservationsData).map(
              ([id, data]: [string, any]) => ({
                id,
                tableId: data.tableId,
                customerName: data.customerName,
                guestCount: data.guestCount || 1,
                startTime: data.startTime,
                endTime: data.endTime,
                status: data.status || "confirmed",
                note: data.note || "",
              })
            );
            setReservations(loadedReservations);
          }
        });

        setLoading(false);
      } catch (err) {
        console.error("Veri yükleme hatası:", err);
        setError("Veriler yüklenirken bir hata oluştu");
        setLoading(false);
        toast.error("Veriler yüklenirken bir hata oluştu");
      }
    };

    loadData();

    // Cleanup
    return () => {
      // Firebase dinleyicileri temizle
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md text-red-800">
        <p>{error}</p>
        <button
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md"
          onClick={() => window.location.reload()}
        >
          Yeniden Dene
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Masa Kategorileri</h3>
          <p className="text-3xl font-bold text-blue-600 mb-4">
            {categories.length}
          </p>
          <Link
            href="/admin/settings"
            className="text-blue-600 hover:underline text-sm flex items-center"
          >
            Kategorileri Yönet →
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Masalar</h3>
          <p className="text-3xl font-bold text-blue-600 mb-4">
            {tables.length}
          </p>
          <Link
            href="/admin/tables"
            className="text-blue-600 hover:underline text-sm flex items-center"
          >
            Masaları Yönet →
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Rezervasyonlar</h3>
          <p className="text-3xl font-bold text-blue-600 mb-4">
            {reservations.length}
          </p>
          <Link
            href="/admin/reservations"
            className="text-blue-600 hover:underline text-sm flex items-center"
          >
            Rezervasyonları Yönet →
          </Link>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Hızlı İşlemler</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/init-db"
            className="bg-blue-50 hover:bg-blue-100 p-4 rounded-md flex flex-col"
          >
            <span className="font-medium text-blue-800">Veritabanı Başlat</span>
            <span className="text-sm text-gray-600 mt-1">
              Veritabanını varsayılan değerlerle başlatın
            </span>
          </Link>

          <Link
            href="/admin/settings"
            className="bg-blue-50 hover:bg-blue-100 p-4 rounded-md flex flex-col"
          >
            <span className="font-medium text-blue-800">Sistem Ayarları</span>
            <span className="text-sm text-gray-600 mt-1">
              Sistem ayarlarını yapılandırın
            </span>
          </Link>

          <Link
            href="/admin/tables"
            className="bg-blue-50 hover:bg-blue-100 p-4 rounded-md flex flex-col"
          >
            <span className="font-medium text-blue-800">Masa Yönetimi</span>
            <span className="text-sm text-gray-600 mt-1">
              Masaları düzenleyin ve yönetin
            </span>
          </Link>

          <Link
            href="/reservation"
            className="bg-blue-50 hover:bg-blue-100 p-4 rounded-md flex flex-col"
          >
            <span className="font-medium text-blue-800">
              Rezervasyon Oluştur
            </span>
            <span className="text-sm text-gray-600 mt-1">
              Yeni bir rezervasyon oluşturun
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
