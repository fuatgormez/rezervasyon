"use client";

import { useState, useEffect } from "react";
import { format, addDays, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import Link from "next/link";
import DatePicker from "@/components/DatePicker";

// Mock veri (daha sonra Firebase'den alınacak)
const mockTables = [
  {
    id: "1",
    name: "Masa 1",
    status: "available",
    capacity: 4,
    category_id: "1",
  },
  {
    id: "2",
    name: "Masa 2",
    status: "available",
    capacity: 2,
    category_id: "1",
  },
  {
    id: "3",
    name: "Masa 3",
    status: "available",
    capacity: 6,
    category_id: "2",
  },
  {
    id: "4",
    name: "Masa 4",
    status: "available",
    capacity: 8,
    category_id: "2",
  },
  {
    id: "5",
    name: "Masa 5",
    status: "available",
    capacity: 4,
    category_id: "3",
  },
];

const mockTableCategories = [
  {
    id: "1",
    name: "İç Mekan",
    color: "rgba(59, 130, 246, 0.8)",
    background_color: "#EFF6FF",
  },
  {
    id: "2",
    name: "Bahçe",
    color: "rgba(16, 185, 129, 0.8)",
    background_color: "#ECFDF5",
  },
  {
    id: "3",
    name: "Teras",
    color: "rgba(245, 158, 11, 0.8)",
    background_color: "#FEF3C7",
  },
];

export default function NewReservationPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [formattedDate, setFormattedDate] = useState<string>("");
  const [availableTables, setAvailableTables] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    customerName: "",
    guestCount: 2,
    phone: "",
    email: "",
    startTime: "19:00",
    duration: 120,
    selectedTableId: "",
    notes: "",
  });

  // Tarih seçildiğinde çalışacak fonksiyon
  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setFormattedDate(format(date, "d MMMM yyyy, EEEE", { locale: tr }));
    // Tarih değiştiğinde masaları yeniden yükle
    loadAvailableTables(date);
  };

  // Sayfa yüklendiğinde tarih formatını ayarla
  useEffect(() => {
    setFormattedDate(format(selectedDate, "d MMMM yyyy, EEEE", { locale: tr }));
    loadAvailableTables(selectedDate);
  }, []);

  // Kullanılabilir masaları yükleme
  const loadAvailableTables = (date: Date) => {
    // Gerçek uygulamada API'den gelecek, şimdi mock veri kullanıyoruz
    const tables = mockTables.filter((table) => table.status === "available");

    // Kategorilerle birleştir ve zenginleştir
    const enrichedTables = tables.map((table) => {
      const category = mockTableCategories.find(
        (cat) => cat.id === table.category_id
      );
      return {
        ...table,
        categoryName: category?.name || "Bilinmeyen Kategori",
        categoryColor: category?.color || "rgba(128,128,128,0.8)",
        categoryBgColor: category?.background_color || "#f0f0f0",
      };
    });

    setAvailableTables(enrichedTables);
  };

  // Form değişikliklerini işle
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Rezervasyon oluştur
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Bitiş saatini hesapla
    const startTime = formData.startTime;
    const [hours, minutes] = startTime.split(":").map(Number);
    const startDate = new Date(selectedDate);
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
      date: format(selectedDate, "yyyy-MM-dd"),
      time: formData.startTime,
      customer_name: formData.customerName,
      guest_count: formData.guestCount,
      table_id: formData.selectedTableId,
      end_time: endTime,
      phone: formData.phone,
      email: formData.email,
      notes: formData.notes,
      status: "pending",
    };

    console.log("Rezervasyon gönderiliyor:", reservationData);

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

      // Rezervasyon sayfasına yönlendir
      window.location.href = "/rezervasyon";
    } catch (error: any) {
      console.error("Rezervasyon hatası:", error);
      alert(`Bir hata oluştu: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm py-4">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Yeni Rezervasyon
            </h1>
            <Link
              href="/rezervasyon"
              className="text-blue-600 hover:text-blue-800"
            >
              Rezervasyonlara Dön
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="mb-2 text-lg font-medium text-gray-700">
            Rezervasyon Tarihi Seçin
          </div>
          <DatePicker
            onDateChange={handleDateChange}
            initialDate={selectedDate}
          />

          <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-100">
            <p className="text-blue-800">
              <span className="font-medium">Seçili tarih:</span> {formattedDate}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-6 text-gray-800">
            Rezervasyon Bilgileri
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Müşteri Bilgileri */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-700">
                  Müşteri Bilgileri
                </h3>

                <div>
                  <label
                    htmlFor="customerName"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Ad Soyad *
                  </label>
                  <input
                    type="text"
                    id="customerName"
                    name="customerName"
                    required
                    value={formData.customerName}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Telefon *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                  >
                    E-posta
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>

                <div>
                  <label
                    htmlFor="guestCount"
                    className="block text-sm font-medium text-gray-700"
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
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>
              </div>

              {/* Rezervasyon Detayları */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-700">
                  Rezervasyon Detayları
                </h3>

                <div>
                  <label
                    htmlFor="startTime"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Saat *
                  </label>
                  <input
                    type="time"
                    id="startTime"
                    name="startTime"
                    required
                    value={formData.startTime}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>

                <div>
                  <label
                    htmlFor="duration"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Süre (dakika) *
                  </label>
                  <select
                    id="duration"
                    name="duration"
                    required
                    value={formData.duration}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
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
                    htmlFor="selectedTableId"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Masa *
                  </label>
                  <select
                    id="selectedTableId"
                    name="selectedTableId"
                    required
                    value={formData.selectedTableId}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  >
                    <option value="">Masa Seçin</option>
                    {availableTables.map((table) => (
                      <option key={table.id} value={table.id}>
                        Masa {table.number} - {table.categoryName} (
                        {table.capacity} kişilik)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="notes"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Notlar
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
              >
                Rezervasyon Oluştur
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
