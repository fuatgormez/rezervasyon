"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

interface SidebarFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: {
    date: Date;
    time: string;
    tableId: string;
    tableName: string;
  };
}

export default function SidebarForm({
  isOpen,
  onClose,
  initialData,
}: SidebarFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    customerName: "",
    guestCount: 2,
    phone: "",
    email: "",
    notes: "",
    duration: 120,
  });

  // Kenar çubuğu açıldığında form verilerini sıfırla
  useEffect(() => {
    if (isOpen) {
      setFormData({
        customerName: "",
        guestCount: 2,
        phone: "",
        email: "",
        notes: "",
        duration: 120,
      });
    }
  }, [isOpen, initialData]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "guestCount" ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Bitiş saatini hesapla
    const [hours, minutes] = initialData.time.split(":").map(Number);
    const startDate = new Date(initialData.date);
    startDate.setHours(hours, minutes, 0, 0);

    const endDate = new Date(startDate.getTime() + formData.duration * 60000);
    const endTime = `${endDate.getHours().toString().padStart(2, "0")}:${endDate
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    // API'ye gönderilecek veri
    const reservationData = {
      user_id: "1", // Normalde giriş yapmış kullanıcının ID'si olmalı
      company_id: "1", // Şirket ID'si, gerçek uygulamada değiştirilmeli
      date: format(initialData.date, "yyyy-MM-dd"),
      time: initialData.time,
      customer_name: formData.customerName,
      guest_count: formData.guestCount,
      table_id: initialData.tableId,
      end_time: endTime,
      phone: formData.phone,
      email: formData.email,
      notes: formData.notes,
      status: "pending",
    };

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reservationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Rezervasyon oluşturulamadı");
      }

      const result = await response.json();
      console.log("Rezervasyon başarıyla oluşturuldu:", result);

      // Başarılı mesajı göster
      alert("Rezervasyon başarıyla oluşturuldu!");

      // Formu kapat ve rezervasyon sayfasını yenile
      onClose();
      window.location.href = "/rezervasyon";
    } catch (error: any) {
      console.error("Rezervasyon hatası:", error);
      alert(`Bir hata oluştu: ${error.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end z-40">
      <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Hızlı Rezervasyon</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Tarih:</span>{" "}
            {format(initialData.date, "d MMMM yyyy")}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Saat:</span> {initialData.time}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Masa:</span> {initialData.tableName}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="customerName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Ad Soyad *
            </label>
            <input
              type="text"
              id="customerName"
              name="customerName"
              required
              value={formData.customerName}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
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
              required
              value={formData.phone}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              E-posta
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="guestCount"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Misafir Sayısı *
            </label>
            <input
              type="number"
              id="guestCount"
              name="guestCount"
              min="1"
              max="20"
              required
              value={formData.guestCount}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="duration"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Süre (dakika) *
            </label>
            <select
              id="duration"
              name="duration"
              required
              value={formData.duration}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="60">1 saat</option>
              <option value="90">1.5 saat</option>
              <option value="120">2 saat</option>
              <option value="150">2.5 saat</option>
              <option value="180">3 saat</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Notlar
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Rezervasyon Oluştur
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
