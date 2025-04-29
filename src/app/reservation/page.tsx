"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import toast, { Toaster } from "react-hot-toast";
import DatePicker from "@/components/DatePicker";
import { ReservationController } from "@/controllers/reservation.controller";
import type { Reservation } from "@/models/types";

// Framer Motion animasyonları
const AnimatePresence = ({
  children,
  mode,
}: {
  children: React.ReactNode;
  mode?: string;
}) => {
  // mode parametresi şu anda kullanılmıyor ama ileride kullanılabilir
  console.log("AnimatePresence mode:", mode);
  return <>{children}</>;
};

const motion = {
  div: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    key?: string | number;
    initial?: Record<string, unknown>;
    animate?: Record<string, unknown>;
    exit?: Record<string, unknown>;
    transition?: Record<string, unknown>;
    className?: string;
    style?: React.CSSProperties;
  }) => {
    return <div {...props}>{children}</div>;
  },
};

// Rezervasyon tipi
interface ReservationFormData {
  customerName: string;
  email: string;
  phone: string;
  date: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  specialRequests?: string;
  tablePreference?: string;
}

export default function ReservationPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);

  // Seçilen tarihe göre rezervasyonları getir
  const fetchReservations = async (date: Date) => {
    setLoading(true);
    try {
      const companyId = "your_company_id"; // Gerçek company_id ile değiştirin
      const formattedDate = format(date, "yyyy-MM-dd");
      const reservations = await ReservationController.getCompanyReservations(
        companyId
      );

      // Seçilen tarihe göre filtrele
      const filteredReservations = reservations.filter(
        (reservation) => reservation.date === formattedDate
      );

      setReservations(filteredReservations);
    } catch (error) {
      console.error("Rezervasyonlar yüklenirken hata:", error);
    } finally {
      setLoading(false);
    }
  };

  // Tarih değiştiğinde rezervasyonları güncelle
  useEffect(() => {
    fetchReservations(selectedDate);
  }, [selectedDate]);

  // Tarih değişikliği handler'ı
  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Rezervasyonlar</h1>

      {/* Tarih Seçici */}
      <div className="mb-8">
        <DatePicker
          initialDate={selectedDate}
          onDateChange={handleDateChange}
        />
      </div>

      {/* Rezervasyon Listesi */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">
          {format(selectedDate, "dd MMMM yyyy", { locale: tr })} Tarihli
          Rezervasyonlar
        </h2>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : reservations.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Bu tarih için rezervasyon bulunmamaktadır.
          </p>
        ) : (
          <div className="grid gap-4">
            {reservations.map((reservation) => (
              <div
                key={reservation.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">Rezervasyon #{reservation.id}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Saat: {reservation.time}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      reservation.status === "confirmed"
                        ? "bg-green-100 text-green-800"
                        : reservation.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {reservation.status === "confirmed"
                      ? "Onaylandı"
                      : reservation.status === "pending"
                      ? "Beklemede"
                      : "İptal Edildi"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Yeni Rezervasyon Butonu */}
      <div className="mt-6 text-center">
        <button
          onClick={() => (window.location.href = "/reservation/new")}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Yeni Rezervasyon Oluştur
        </button>
      </div>
    </div>
  );
}
