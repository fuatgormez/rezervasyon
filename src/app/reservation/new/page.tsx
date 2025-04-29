"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import DatePicker from "@/components/DatePicker";
import TimeGrid from "@/components/reservation/TimeGrid";
import { ReservationController } from "@/controllers/reservation.controller";
import toast from "react-hot-toast";

interface Table {
  id: string;
  number: number;
  capacity: number;
  status: "available" | "unavailable" | "reserved";
}

export default function NewReservationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reservations, setReservations] = useState<any[]>([]);
  const [tables, setTables] = useState<Table[]>([]);

  // Form verisi için state
  const [formData, setFormData] = useState({
    customerName: "",
    email: "",
    phone: "",
    time: "19:00",
    guestCount: 2,
    tableId: "",
    tableName: "",
    specialRequests: "",
  });

  // Tabloları ve rezervasyonları yükle
  useEffect(() => {
    const loadTablesAndReservations = async () => {
      try {
        // Burada gerçek API çağrıları olacak, şimdilik örnek veriler kullanıyoruz
        const mockTables: Table[] = [
          { id: "1", number: 1, capacity: 2, status: "available" },
          { id: "2", number: 2, capacity: 4, status: "available" },
          { id: "3", number: 3, capacity: 6, status: "available" },
          { id: "4", number: 4, capacity: 2, status: "available" },
          { id: "5", number: 5, capacity: 4, status: "available" },
        ];

        const formattedDate = format(selectedDate, "yyyy-MM-dd");
        const mockReservations = [
          {
            id: "1",
            table_id: "1",
            time: "12:00",
            date: formattedDate,
            customer_name: "Ahmet Yılmaz",
          },
          {
            id: "2",
            table_id: "3",
            time: "19:00",
            date: formattedDate,
            customer_name: "Mehmet Kaya",
          },
        ];

        setTables(mockTables);
        setReservations(mockReservations);
      } catch (error) {
        console.error("Veri yüklenirken hata:", error);
        toast.error("Veriler yüklenirken bir hata oluştu.");
      }
    };

    loadTablesAndReservations();
  }, [selectedDate]);

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  // TimeGrid'de boş hücreye tıklandığında çağrılacak fonksiyon
  const handleCellClick = (
    time: string,
    tableId: string,
    tableName: string
  ) => {
    // Form verilerini güncelle
    setFormData((prev) => ({
      ...prev,
      time,
      tableId,
      tableName,
    }));

    // Kullanıcıya geri bildirim ver
    toast.success(`${tableName}, Saat: ${time} seçildi!`);
  };

  const handleInputChange = (
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Eğer masa seçilmemişse uyarı ver
      if (!formData.tableId) {
        toast.error("Lütfen rezervasyon için bir masa seçin!");
        setLoading(false);
        return;
      }

      // Bitiş saatini hesapla (varsayılan 2 saat)
      const [hours, minutes] = formData.time.split(":").map(Number);
      const startDate = new Date(selectedDate);
      startDate.setHours(hours, minutes, 0, 0);

      const endDate = new Date(startDate.getTime() + 120 * 60000); // 120 dakika = 2 saat
      const endTime = `${endDate
        .getHours()
        .toString()
        .padStart(2, "0")}:${endDate.getMinutes().toString().padStart(2, "0")}`;

      // API'ye gönderilecek veri
      const reservationData = {
        user_id: "1", // Normalde giriş yapmış kullanıcının ID'si olmalı
        company_id: "1", // Şirket ID'si, gerçek uygulamada değiştirilmeli
        date: format(selectedDate, "yyyy-MM-dd"),
        time: formData.time,
        customer_name: formData.customerName,
        guest_count: formData.guestCount,
        table_id: formData.tableId,
        end_time: endTime,
        phone: formData.phone,
        email: formData.email,
        notes: formData.specialRequests,
        status: "pending",
      };

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

      toast.success("Rezervasyon başarıyla oluşturuldu!");
      router.push("/reservation");
    } catch (error: any) {
      console.error("Rezervasyon hatası:", error);
      toast.error(`Bir hata oluştu: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Yeni Rezervasyon</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Sol Taraf - Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Rezervasyon Bilgileri</h2>

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
                onChange={handleInputChange}
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
                onChange={handleInputChange}
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
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="date"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Tarih *
              </label>
              <div className="border border-gray-300 rounded-md p-2">
                <DatePicker
                  initialDate={selectedDate}
                  onDateChange={handleDateChange}
                />
              </div>
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
                required
                value={formData.time}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Array.from({ length: 14 }, (_, i) => {
                  const hour = i + 9; // 09:00'dan başla
                  return (
                    <option
                      key={`${hour}:00`}
                      value={`${hour.toString().padStart(2, "0")}:00`}
                    >
                      {`${hour.toString().padStart(2, "0")}:00`}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label
                htmlFor="guestCount"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Kişi Sayısı *
              </label>
              <select
                id="guestCount"
                name="guestCount"
                required
                value={formData.guestCount}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Array.from({ length: 10 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1} Kişi
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="tableName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Seçili Masa
              </label>
              <input
                type="text"
                id="tableName"
                value={formData.tableName || "Lütfen çizelgeden bir masa seçin"}
                readOnly
                className="w-full border border-gray-300 rounded-md p-2 bg-gray-50"
              />
            </div>

            <div>
              <label
                htmlFor="specialRequests"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Özel İstekler
              </label>
              <textarea
                id="specialRequests"
                name="specialRequests"
                rows={3}
                value={formData.specialRequests}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Varsa özel isteklerinizi belirtiniz..."
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading || !formData.tableId}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "İşleniyor..." : "Rezervasyon Oluştur"}
              </button>
            </div>
          </form>
        </div>

        {/* Sağ Taraf - Rezervasyon Çizelgesi */}
        <div>
          <div className="bg-white rounded-lg shadow mb-4">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">
                {format(selectedDate, "d MMMM yyyy", { locale: tr })} Günü
                Rezervasyonları
              </h2>
            </div>
            <div className="p-4 bg-blue-50">
              <p className="text-blue-600 text-sm">
                Lütfen rezervasyon için çizelgeden uygun bir masa ve saat seçin.
                Seçim yaptığınızda form otomatik olarak doldurulacaktır.
              </p>
              {formData.tableId && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-green-700 text-sm">
                    <span className="font-semibold">Seçili Masa:</span>{" "}
                    {formData.tableName},{" "}
                    <span className="font-semibold">Saat:</span> {formData.time}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            {loading ? (
              <div className="p-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <TimeGrid
                date={selectedDate}
                tables={tables}
                reservations={reservations}
                onCellClick={handleCellClick}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
