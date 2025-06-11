"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { ref, get, push, set, remove, update } from "firebase/database";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import toast from "react-hot-toast";

// Masa türü arayüzü
interface TableType {
  id: string;
  number: number;
  capacity: number;
  categoryId: string;
  status: "active" | "inactive";
}

// Rezervasyon türü arayüzü
interface ReservationType {
  id: string;
  tableId: string;
  customerName: string;
  guestCount: number;
  startTime: string;
  endTime: string;
  status: "confirmed" | "pending" | "cancelled";
  note?: string;
}

export default function SimpleDashboardPage() {
  const [tables, setTables] = useState<TableType[]>([]);
  const [reservations, setReservations] = useState<ReservationType[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [isLoading, setIsLoading] = useState(false);

  // Formlar için state
  const [newReservation, setNewReservation] = useState({
    customerName: "",
    tableId: "",
    guestCount: 1,
    date: format(new Date(), "yyyy-MM-dd"),
    time: "12:00",
    duration: 120,
    note: "",
  });

  // Masaları yükle
  const loadTables = async () => {
    try {
      setIsLoading(true);
      const tablesRef = ref(db, "tables");
      const snapshot = await get(tablesRef);

      if (snapshot.exists()) {
        const tablesData = snapshot.val();
        const loadedTables = Object.entries(tablesData).map(
          ([id, data]: [string, any]) => ({
            id,
            number: data.number || 0,
            capacity: data.capacity || 2,
            categoryId: data.category_id || "1",
            status: data.status || "active",
          })
        );

        setTables(loadedTables);
        console.log("Masalar yüklendi:", loadedTables.length);
      } else {
        console.log("Masalar bulunamadı");
        setTables([]);
      }
    } catch (error) {
      console.error("Masaları yükleme hatası:", error);
      toast.error("Masalar yüklenirken bir hata oluştu");
    } finally {
      setIsLoading(false);
    }
  };

  // Rezervasyonları yükle
  const loadReservations = async () => {
    try {
      setIsLoading(true);
      const reservationsRef = ref(db, "reservations");
      const snapshot = await get(reservationsRef);

      if (snapshot.exists()) {
        const reservationsData = snapshot.val();
        const loadedReservations = Object.entries(reservationsData)
          .map(([id, data]: [string, any]) => {
            const startTime = new Date(data.start_time);
            const formattedDate = format(startTime, "yyyy-MM-dd");

            // Seçilen tarihe göre filtrele
            if (formattedDate === selectedDate) {
              return {
                id,
                tableId: data.table_id || "",
                customerName: data.customer_name || "",
                guestCount: data.guest_count || 1,
                startTime: data.start_time,
                endTime: data.end_time || data.start_time,
                status: data.status || "pending",
                note: data.note || "",
              };
            }
            return null;
          })
          .filter(Boolean) as ReservationType[];

        setReservations(loadedReservations);
        console.log("Rezervasyonlar yüklendi:", loadedReservations.length);
      } else {
        console.log("Rezervasyon bulunamadı");
        setReservations([]);
      }
    } catch (error) {
      console.error("Rezervasyonları yükleme hatası:", error);
      toast.error("Rezervasyonlar yüklenirken bir hata oluştu");
    } finally {
      setIsLoading(false);
    }
  };

  // Sayfa yüklendiğinde verileri getir
  useEffect(() => {
    loadTables();
  }, []);

  // Tarih değiştiğinde rezervasyonları güncelle
  useEffect(() => {
    loadReservations();
  }, [selectedDate]);

  // Form alanlarını güncelle
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setNewReservation((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Yeni rezervasyon ekle
  const handleAddReservation = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Form validasyonu
      if (!newReservation.customerName) {
        toast.error("Lütfen müşteri adını girin");
        return;
      }

      if (!newReservation.tableId) {
        toast.error("Lütfen bir masa seçin");
        return;
      }

      // Tarih ve saat formatını birleştir
      const startTime = `${newReservation.date}T${newReservation.time}:00`;

      // Bitiş zamanını hesapla
      const startDate = new Date(startTime);
      const endDate = new Date(
        startDate.getTime() + newReservation.duration * 60000
      );
      const endTime = endDate.toISOString();

      // Rezervasyon verisini oluştur
      const reservationData = {
        table_id: newReservation.tableId,
        customer_name: newReservation.customerName,
        guest_count: Number(newReservation.guestCount),
        start_time: startTime,
        end_time: endTime,
        status: "confirmed",
        note: newReservation.note,
        created_at: new Date().toISOString(),
      };

      // Realtime Database'e ekle
      const newReservationRef = push(ref(db, "reservations"));
      await set(newReservationRef, reservationData);

      // Formu temizle
      setNewReservation({
        customerName: "",
        tableId: "",
        guestCount: 1,
        date: format(new Date(), "yyyy-MM-dd"),
        time: "12:00",
        duration: 120,
        note: "",
      });

      // Başarılı mesajı
      toast.success("Rezervasyon başarıyla eklendi");

      // Rezervasyonları yeniden yükle
      loadReservations();
    } catch (error) {
      console.error("Rezervasyon ekleme hatası:", error);
      toast.error("Rezervasyon eklenirken bir hata oluştu");
    }
  };

  // Rezervasyon sil
  const handleDeleteReservation = async (id: string) => {
    if (confirm("Bu rezervasyonu silmek istediğinize emin misiniz?")) {
      try {
        const reservationRef = ref(db, `reservations/${id}`);
        await remove(reservationRef);
        toast.success("Rezervasyon başarıyla silindi");
        loadReservations();
      } catch (error) {
        console.error("Rezervasyon silme hatası:", error);
        toast.error("Rezervasyon silinirken bir hata oluştu");
      }
    }
  };

  // Rezervasyon durumunu güncelle
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const reservationRef = ref(db, `reservations/${id}`);
      await update(reservationRef, {
        status: newStatus,
        updated_at: new Date().toISOString(),
      });
      toast.success("Rezervasyon durumu güncellendi");
      loadReservations();
    } catch (error) {
      console.error("Durum güncelleme hatası:", error);
      toast.error("Durum güncellenirken bir hata oluştu");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Basit Rezervasyon Yönetimi</h1>
        <div className="flex space-x-2">
          <Link href="/admin">
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded">
              Ana Panel
            </button>
          </Link>
          <Link href="/admin/settings">
            <button className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded">
              Ayarlar
            </button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sol panel - Rezervasyon Formu */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-4">Yeni Rezervasyon Ekle</h2>
          <form onSubmit={handleAddReservation} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Müşteri Adı
              </label>
              <input
                type="text"
                name="customerName"
                value={newReservation.customerName}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Masa
              </label>
              <select
                name="tableId"
                value={newReservation.tableId}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="">Masa Seçin</option>
                {tables
                  .filter((table) => table.status === "active")
                  .map((table) => (
                    <option key={table.id} value={table.id}>
                      Masa {table.number} ({table.capacity} kişilik)
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Kişi Sayısı
              </label>
              <input
                type="number"
                name="guestCount"
                value={newReservation.guestCount}
                onChange={handleInputChange}
                min="1"
                className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tarih
              </label>
              <input
                type="date"
                name="date"
                value={newReservation.date}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Saat
              </label>
              <input
                type="time"
                name="time"
                value={newReservation.time}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Süre (dakika)
              </label>
              <input
                type="number"
                name="duration"
                value={newReservation.duration}
                onChange={handleInputChange}
                min="30"
                step="30"
                className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Not
              </label>
              <textarea
                name="note"
                value={newReservation.note}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                rows={3}
              ></textarea>
            </div>

            <div>
              <button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
              >
                Rezervasyon Ekle
              </button>
            </div>
          </form>
        </div>

        {/* Orta panel - Rezervasyon Listesi */}
        <div className="bg-white p-4 rounded shadow md:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Rezervasyonlar</h2>
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <button
                onClick={() => loadReservations()}
                className="bg-gray-200 hover:bg-gray-300 p-1 rounded"
                title="Yenile"
              >
                🔄
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-4">Yükleniyor...</div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              Bu tarih için rezervasyon bulunamadı
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Müşteri
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Masa
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kişi
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Başlangıç
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reservations.map((reservation) => {
                    const table = tables.find(
                      (t) => t.id === reservation.tableId
                    );
                    return (
                      <tr key={reservation.id}>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {reservation.customerName}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {table ? `Masa ${table.number}` : "-"}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {reservation.guestCount}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {new Date(reservation.startTime).toLocaleTimeString(
                            "tr-TR",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              reservation.status === "confirmed"
                                ? "bg-green-100 text-green-800"
                                : reservation.status === "cancelled"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {reservation.status === "confirmed"
                              ? "Onaylandı"
                              : reservation.status === "cancelled"
                              ? "İptal Edildi"
                              : "Beklemede"}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() =>
                                handleUpdateStatus(reservation.id, "confirmed")
                              }
                              className="text-green-600 hover:text-green-900"
                              title="Onayla"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() =>
                                handleUpdateStatus(reservation.id, "cancelled")
                              }
                              className="text-red-600 hover:text-red-900"
                              title="İptal Et"
                            >
                              ✗
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteReservation(reservation.id)
                              }
                              className="text-gray-600 hover:text-gray-900"
                              title="Sil"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
