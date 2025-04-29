"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import DatePicker from "@/components/DatePicker";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export default function ReservationPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [formattedDate, setFormattedDate] = useState<string>("");
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Tarih seçildiğinde çalışacak fonksiyon
  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setFormattedDate(format(date, "d MMMM yyyy, EEEE", { locale: tr }));
    fetchReservations(date);
  };

  // Rezervasyonları getiren fonksiyon
  const fetchReservations = async (date: Date) => {
    setLoading(true);
    try {
      const formattedDateStr = format(date, "yyyy-MM-dd");
      // Şimdilik sabit bir companyId kullanıyoruz, gerçek uygulamada değiştirilmeli
      const companyId = "1";
      console.log(`Rezervasyonlar getiriliyor: ${formattedDateStr}`);

      const response = await fetch(
        `/api/reservations?companyId=${companyId}&date=${formattedDateStr}`
      );

      if (!response.ok) {
        throw new Error("Rezervasyonlar yüklenemedi");
      }

      const data = await response.json();
      console.log("Gelen rezervasyonlar:", data);

      if (Array.isArray(data.reservations)) {
        setReservations(data.reservations);
      } else {
        console.warn("Rezervasyon verisi dizi değil:", data);
        setReservations([]);
      }
    } catch (error) {
      console.error("Rezervasyon yükleme hatası:", error);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  // Sayfa yüklendiğinde tarih formatını ayarla ve verileri getir
  useEffect(() => {
    setFormattedDate(format(selectedDate, "d MMMM yyyy, EEEE", { locale: tr }));
    fetchReservations(selectedDate);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm py-4">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Rezervasyonlar</h1>
            <div className="flex gap-3">
              <Link
                href="/rezervasyon/yeni"
                className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
              >
                Yeni Rezervasyon
              </Link>
              <Link href="/" className="text-blue-600 hover:text-blue-800">
                Ana Sayfaya Dön
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="mb-2 text-sm font-medium text-gray-600">
            Tarihi değiştir:
          </div>
          <DatePicker
            onDateChange={handleDateChange}
            initialDate={selectedDate}
          />
          <p className="mt-4 text-sm text-gray-500">
            <span className="font-medium">Seçili tarih:</span> {formattedDate}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              {formattedDate} Rezervasyonları
            </h2>
            <Link
              href="/rezervasyon/yeni"
              className="text-blue-600 hover:text-blue-800 flex items-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Yeni Rezervasyon Ekle
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="loader">Yükleniyor...</div>
            </div>
          ) : reservations.length > 0 ? (
            <div className="space-y-4">
              {reservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="border rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex justify-between">
                    <div>
                      <h3 className="font-medium">
                        {reservation.customer_name || "Misafir"}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Saat: {reservation.time}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {reservation.status === "pending"
                          ? "Beklemede"
                          : reservation.status === "confirmed"
                          ? "Onaylandı"
                          : reservation.status === "cancelled"
                          ? "İptal Edildi"
                          : reservation.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border rounded-md p-4 text-center text-gray-500">
              {formattedDate} için rezervasyon bulunamadı.
              <p className="mt-2 text-sm">
                <Link
                  href="/rezervasyon/yeni"
                  className="text-blue-600 hover:text-blue-800"
                >
                  Yeni rezervasyon oluşturmak için tıklayın.
                </Link>
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
