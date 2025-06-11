"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import toast, { Toaster } from "react-hot-toast";
import DatePicker from "@/components/DatePicker";
import type { Reservation } from "@/models/types";
import { db } from "@/config/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";

// Framer Motion animasyonları
const AnimatePresence = ({
  children,
  mode,
}: {
  children: React.ReactNode;
  mode?: string;
}) => {
  // mode parametresi şu anda kullanılmıyor ama ileride kullanılabilir
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
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      // Firebase'den rezervasyonları çek
      const reservationsRef = collection(db, "reservations");
      const reservationsQuery = query(
        reservationsRef,
        where("start_time", ">=", Timestamp.fromDate(startDate)),
        where("start_time", "<=", Timestamp.fromDate(endDate))
      );

      const querySnapshot = await getDocs(reservationsQuery);

      // Verileri model tipine dönüştür
      const formattedReservations = querySnapshot.docs.map((doc) => {
        const res = doc.data();
        const startTime = res.start_time?.toDate() || new Date();
        const endTime = res.end_time?.toDate() || new Date();

        return {
          id: doc.id,
          user_id: res.created_by || "",
          company_id: res.company_id || "",
          branch_id: res.branch_id || "",
          table_id: res.table_id,
          date: format(startTime, "yyyy-MM-dd"),
          time: format(startTime, "HH:mm"),
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: res.status,
          payment_status: res.payment_status,
          created_at:
            res.created_at?.toDate()?.toISOString() || new Date().toISOString(),
          updated_at:
            res.updated_at?.toDate()?.toISOString() || new Date().toISOString(),
          customer_name: res.customer_name,
          guest_count: res.guest_count,
          phone: res.customer_phone || "",
          email: res.customer_email || "",
          notes: res.note || "",
          color: res.color || "",
        };
      }) as Reservation[];

      setReservations(formattedReservations);
    } catch (error) {
      console.error("Rezervasyonlar yüklenirken hata:", error);
      toast.error("Rezervasyonlar yüklenemedi.");
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

  // Rezervasyon durumu değiştirme
  const handleStatusChange = async (
    id: string,
    status: Reservation["status"]
  ) => {
    try {
      toast.loading("Rezervasyon durumu değiştiriliyor...");

      // Firebase'de rezervasyon durumunu güncelle
      const reservationRef = doc(db, "reservations", id);
      await updateDoc(reservationRef, {
        status: status,
        updated_at: Timestamp.now(),
      });

      toast.dismiss();
      toast.success("Rezervasyon durumu güncellendi");
      // Listeyi yenile
      fetchReservations(selectedDate);
    } catch (error) {
      toast.dismiss();
      toast.error("İşlem sırasında bir hata oluştu");
      console.error("Durum değiştirme hatası:", error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster position="top-right" />
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
                  <div className="space-y-1">
                    <p className="font-medium">{reservation.customer_name}</p>
                    <p className="text-sm text-gray-600">
                      {reservation.time} -{" "}
                      {reservation.end_time
                        ? format(new Date(reservation.end_time), "HH:mm")
                        : ""}
                    </p>
                    <p className="text-sm text-gray-600">
                      Kişi Sayısı: {reservation.guest_count}
                    </p>
                    {reservation.phone && (
                      <p className="text-sm text-gray-600">
                        Tel: {reservation.phone}
                      </p>
                    )}
                    {reservation.email && (
                      <p className="text-sm text-gray-600">
                        Email: {reservation.email}
                      </p>
                    )}
                    {reservation.notes && (
                      <p className="text-sm text-gray-600 italic">
                        Not: {reservation.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        reservation.status === "confirmed"
                          ? "bg-green-100 text-green-800"
                          : reservation.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : reservation.status === "completed"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {reservation.status === "confirmed"
                        ? "Onaylandı"
                        : reservation.status === "pending"
                        ? "Beklemede"
                        : reservation.status === "completed"
                        ? "Tamamlandı"
                        : "İptal Edildi"}
                    </span>

                    {/* Ödeme Durumu */}
                    {reservation.payment_status && (
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${
                          reservation.payment_status === "paid"
                            ? "bg-green-100 text-green-800"
                            : reservation.payment_status === "partial"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {reservation.payment_status === "paid"
                          ? "Ödendi"
                          : reservation.payment_status === "partial"
                          ? "Kısmi Ödeme"
                          : "Ödenmedi"}
                      </span>
                    )}
                  </div>
                </div>

                {/* İşlem Butonları */}
                <div className="mt-4 flex justify-end gap-2">
                  {reservation.status === "pending" && (
                    <button
                      onClick={() =>
                        handleStatusChange(reservation.id, "confirmed")
                      }
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                      Onayla
                    </button>
                  )}

                  {(reservation.status === "pending" ||
                    reservation.status === "confirmed") && (
                    <button
                      onClick={() =>
                        handleStatusChange(reservation.id, "completed")
                      }
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Tamamlandı
                    </button>
                  )}

                  {reservation.status !== "cancelled" && (
                    <button
                      onClick={() =>
                        handleStatusChange(reservation.id, "cancelled")
                      }
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      İptal
                    </button>
                  )}

                  <Link href={`/reservation/${reservation.id}`}>
                    <button className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700">
                      Düzenle
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Yeni Rezervasyon Butonu */}
      <div className="mt-6 text-center">
        <Link href="/reservation/new">
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Yeni Rezervasyon Oluştur
          </button>
        </Link>
      </div>
    </div>
  );
}
