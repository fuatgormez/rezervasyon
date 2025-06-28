"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/hooks";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

// Rezervasyon tipi
interface Reservation {
  id?: string;
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

export default function ReservationForm() {
  const router = useRouter();
  const { user } = useAuth();

  // Form durumu
  const [formData, setFormData] = useState<
    Omit<Reservation, "id" | "userId" | "status" | "createdAt">
  >({
    name: "",
    email: "",
    phone: "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "18:00",
    guests: 2,
    notes: "",
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNumberChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: parseInt(value, 10),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      // Form validasyonu
      if (
        !formData.name ||
        !formData.email ||
        !formData.phone ||
        !formData.date ||
        !formData.time
      ) {
        throw new Error("Lütfen tüm zorunlu alanları doldurun.");
      }

      // Rezervasyon nesnesi oluştur
      const reservationData: Reservation = {
        ...formData,
        userId: user?.uid || "anonymous",
        status: "pending",
      };

      // API'ye kaydet
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reservationData),
      });

      if (!response.ok) {
        throw new Error("Rezervasyon kaydedilemedi");
      }

      // Başarılı işlem sonrası yönlendirme
      router.push("/reservations/success");
    } catch (err: any) {
      setFormError(
        err.message || "Rezervasyon oluşturulurken bir hata oluştu."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">
        Rezervasyon Oluştur
      </h2>

      {formError && (
        <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
          <p>{formError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Ad Soyad *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="Örn: Ahmet Yılmaz"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              E-posta *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Örn: ahmet@email.com"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Telefon *
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              placeholder="Örn: +90 532 123 45 67"
              value={formData.phone}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="guests"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Kişi Sayısı *
            </label>
            <select
              id="guests"
              name="guests"
              value={formData.guests}
              onChange={handleNumberChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <option key={num} value={num}>
                  {num} kişi
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="date"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Tarih *
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              min={format(new Date(), "yyyy-MM-dd")}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="time"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Saat *
            </label>
            <select
              id="time"
              name="time"
              value={formData.time}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              {[
                "12:00",
                "12:30",
                "13:00",
                "13:30",
                "14:00",
                "14:30",
                "15:00",
                "15:30",
                "16:00",
                "16:30",
                "17:00",
                "17:30",
                "18:00",
                "18:30",
                "19:00",
                "19:30",
                "20:00",
                "20:30",
                "21:00",
                "21:30",
              ].map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Notlar (Opsiyonel)
          </label>
          <textarea
            id="notes"
            name="notes"
            placeholder="Örn: Doğum günü kutlaması, özel diyet, allerji bilgileri, masa tercihi"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          ></textarea>
        </div>

        <div className="flex justify-center">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-6 py-2 rounded-md text-white font-medium ${
              isSubmitting
                ? "bg-indigo-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {isSubmitting
              ? "Rezervasyon Oluşturuluyor..."
              : "Rezervasyon Oluştur"}
          </button>
        </div>
      </form>
    </div>
  );
}
