"use client";

import { useEffect, useState } from "react";
import { useFirestore, useAuthContext } from "@/lib/firebase";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import AuthGuard from "@/components/AuthGuard";
import Link from "next/link";

// Rezervasyon tipi
interface Reservation {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  status: "pending" | "confirmed" | "cancelled";
  notes?: string;
  createdAt?: Date;
}

export default function ReservationsPage() {
  const { user } = useAuthContext();
  const { getAll, remove, update, loading, error } =
    useFirestore<Reservation>("reservations");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReservations = async () => {
      setIsLoading(true);
      try {
        const data = await getAll();
        setReservations(data);
      } catch (error) {
        console.error("Rezervasyonlar yüklenirken hata oluştu:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReservations();
  }, [getAll]);

  const handleStatusChange = async (
    id: string,
    newStatus: "confirmed" | "cancelled"
  ) => {
    try {
      await update(id, { status: newStatus });
      setReservations((prev) =>
        prev.map((res) => (res.id === id ? { ...res, status: newStatus } : res))
      );
    } catch (error) {
      console.error("Durum güncellenirken hata oluştu:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Bu rezervasyonu silmek istediğinizden emin misiniz?")) {
      try {
        await remove(id);
        setReservations((prev) => prev.filter((res) => res.id !== id));
      } catch (error) {
        console.error("Rezervasyon silinirken hata oluştu:", error);
      }
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Onaylandı";
      case "cancelled":
        return "İptal Edildi";
      default:
        return "Beklemede";
    }
  };

  return (
    <AuthGuard>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Rezervasyonlar</h1>
          <Link
            href="/reservations/new"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Yeni Rezervasyon
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : reservations.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">Henüz rezervasyon bulunmuyor.</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Müşteri
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Tarih & Saat
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Kişi
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Durum
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reservations.map((reservation) => (
                  <tr key={reservation.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {reservation.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {reservation.email}
                      </div>
                      <div className="text-sm text-gray-500">
                        {reservation.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {format(new Date(reservation.date), "d MMMM yyyy", {
                          locale: tr,
                        })}
                      </div>
                      <div className="text-sm text-gray-500">
                        {reservation.time}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {reservation.guests} kişi
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusBadgeClass(
                          reservation.status
                        )}`}
                      >
                        {getStatusText(reservation.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {reservation.status === "pending" && (
                        <>
                          <button
                            onClick={() =>
                              handleStatusChange(reservation.id, "confirmed")
                            }
                            className="text-green-600 hover:text-green-900 mr-3"
                          >
                            Onayla
                          </button>
                          <button
                            onClick={() =>
                              handleStatusChange(reservation.id, "cancelled")
                            }
                            className="text-red-600 hover:text-red-900 mr-3"
                          >
                            İptal Et
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(reservation.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
