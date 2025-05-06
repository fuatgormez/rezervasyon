"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ReservationType } from "@/models/types";
import { ReservationModel } from "@/models/reservation";

export default function ConfirmationPage() {
  const searchParams = useSearchParams();
  const [reservation, setReservation] = useState<ReservationType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReservation = async () => {
      const id = searchParams.get("id");
      if (!id) {
        setError("Rezervasyon ID'si bulunamadı");
        return;
      }

      // Test ID kontrolü
      if (id.startsWith("test_")) {
        setReservation({
          id: id,
          customerId: "test_customer",
          customerName: "Test Müşteri",
          tableId: "t1",
          startTime: "12:00",
          endTime: "14:00",
          guests: 2,
          status: "confirmed",
          type: "RESERVATION",
          phone: "5551234567",
          isNewGuest: true,
          language: "TR",
        });
        return;
      }

      try {
        const reservationData = await ReservationModel.getById(id);
        if (!reservationData) {
          throw new Error("Rezervasyon bulunamadı");
        }
        setReservation(reservationData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bir hata oluştu");
      }
    };

    fetchReservation();
  }, [searchParams]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Hata</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/"
            className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Yükleniyor...
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold text-green-600 mb-4">
          Rezervasyon Onaylandı!
        </h1>
        <div className="space-y-4">
          <div>
            <h2 className="font-semibold text-gray-700">Müşteri Bilgileri</h2>
            <p className="text-gray-600">İsim: {reservation.customerName}</p>
            <p className="text-gray-600">Telefon: {reservation.phone || "-"}</p>
          </div>
          <div>
            <h2 className="font-semibold text-gray-700">
              Rezervasyon Detayları
            </h2>
            <p className="text-gray-600">
              Saat: {reservation.startTime} - {reservation.endTime}
            </p>
            <p className="text-gray-600">Kişi Sayısı: {reservation.guests}</p>
            <p className="text-gray-600">Masa No: {reservation.tableId}</p>
          </div>
        </div>
        <Link
          href="/"
          className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors mt-6"
        >
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  );
}
