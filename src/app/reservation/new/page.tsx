"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import DatePicker from "@/components/DatePicker";
import TimeGrid from "@/components/reservation/TimeGrid";
import toast, { Toaster } from "react-hot-toast";
import { db } from "@/lib/supabase/client";

interface Table {
  id: string;
  number: number;
  capacity: number;
  status: string;
  category_id?: string;
}

interface ReservationData {
  id: string;
  table_id: string;
  customer_name: string;
  start_time: string;
  end_time: string;
}

export default function NewReservationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reservations, setReservations] = useState<ReservationData[]>([]);
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
    endTime: "21:00",
    specialRequests: "",
  });

  // Tabloları ve rezervasyonları yükle
  useEffect(() => {
    const loadTablesAndReservations = async () => {
      try {
        // Masaları yükle
        const tableData = await db.tables.getAll();
        setTables(tableData);

        // Seçilen gün için rezervasyonları yükle
        const startDate = new Date(selectedDate);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(selectedDate);
        endDate.setHours(23, 59, 59, 999);

        const reservationData = await db.reservations.getByDateRange(
          startDate.toISOString(),
          endDate.toISOString()
        );

        setReservations(reservationData);
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
    // Bitiş saatini hesapla (varsayılan 2 saat)
    const [hours, minutes] = time.split(":").map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);

    const endTime = new Date(startTime.getTime() + 120 * 60000); // 120 dakika = 2 saat
    const endTimeStr = `${endTime
      .getHours()
      .toString()
      .padStart(2, "0")}:${endTime.getMinutes().toString().padStart(2, "0")}`;

    // Form verilerini güncelle
    setFormData((prev) => ({
      ...prev,
      time,
      endTime: endTimeStr,
      tableId,
      tableName: `Masa ${tableName}`,
    }));

    // Kullanıcıya geri bildirim ver
    toast.success(`Masa ${tableName}, Saat: ${time} seçildi!`);
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

      // Başlangıç ve bitiş zamanlarını oluştur
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const startTimeStr = `${dateStr}T${formData.time}:00`;
      const endTimeStr = `${dateStr}T${formData.endTime}:00`;

      // Rezervasyon çakışmasını kontrol et
      const hasConflict = await db.reservations.checkConflict(
        formData.tableId,
        startTimeStr,
        endTimeStr
      );

      if (hasConflict) {
        toast.error("Bu zaman diliminde masa zaten rezerve edilmiş!");
        setLoading(false);
        return;
      }

      // Rezervasyon oluştur
      await db.reservations.create({
        table_id: formData.tableId,
        customer_name: formData.customerName,
        customer_phone: formData.phone,
        customer_email: formData.email,
        guest_count: formData.guestCount,
        start_time: startTimeStr,
        end_time: endTimeStr,
        status: "confirmed",
        note: formData.specialRequests,
      });

      toast.success("Rezervasyon başarıyla oluşturuldu!");
      router.push("/reservation");
    } catch (error: any) {
      console.error("Rezervasyon hatası:", error);
      toast.error(`Bir hata oluştu: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Saatleri göster
  const availableTimes: string[] = [];
  for (let hour = 8; hour <= 23; hour++) {
    availableTimes.push(`${hour.toString().padStart(2, "0")}:00`);
    availableTimes.push(`${hour.toString().padStart(2, "0")}:30`);
  }

  // TimeGrid için rezervasyon haritası oluştur
  const reservationMap: Record<
    string,
    Record<string, { id: string; customerName: string }>
  > = {};
  reservations.forEach((res) => {
    if (!reservationMap[res.table_id]) {
      reservationMap[res.table_id] = {};
    }

    const startTime = new Date(res.start_time);
    const endTime = new Date(res.end_time);

    // Her yarım saatlik dilimi kontrol et
    for (
      let time = new Date(startTime);
      time < endTime;
      time.setMinutes(time.getMinutes() + 30)
    ) {
      const timeStr = `${time.getHours().toString().padStart(2, "0")}:${time
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
      if (availableTimes.includes(timeStr)) {
        reservationMap[res.table_id][timeStr] = {
          id: res.id,
          customerName: res.customer_name,
        };
      }
    }
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster position="top-right" />
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

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="time"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Başlangıç Saati *
                </label>
                <select
                  id="time"
                  name="time"
                  required
                  value={formData.time}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {availableTimes.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="endTime"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Bitiş Saati *
                </label>
                <select
                  id="endTime"
                  name="endTime"
                  required
                  value={formData.endTime}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {availableTimes.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="guestCount"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Kişi Sayısı *
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  id="guestCount"
                  name="guestCount"
                  required
                  value={formData.guestCount}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="tableId"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Seçilen Masa
              </label>
              <input
                type="text"
                id="tableName"
                name="tableName"
                readOnly
                value={formData.tableName}
                className="w-full border border-gray-300 rounded-md p-2 bg-gray-50"
              />
              <input
                type="hidden"
                id="tableId"
                name="tableId"
                value={formData.tableId}
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
              ></textarea>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  loading ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {loading ? "İşleniyor..." : "Rezervasyonu Tamamla"}
              </button>
            </div>
          </form>
        </div>

        {/* Sağ Taraf - Masa ve Saat Seçimi */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Masa ve Saat Seçimi</h2>
            <p className="text-sm text-gray-600 mb-4">
              Lütfen aşağıdaki tabloda uygun bir masa ve saat seçin. Yeşil
              hücreler müsait, kırmızı hücreler dolu masaları gösterir.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Masa
                  </th>
                  {availableTimes.map((time) => (
                    <th
                      key={time}
                      className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {time}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tables.map((table) => (
                  <tr key={table.id}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      Masa {table.number} ({table.capacity} kişilik)
                    </td>
                    {availableTimes.map((time) => {
                      const isReserved = reservationMap[table.id]?.[time];
                      return (
                        <td
                          key={`${table.id}-${time}`}
                          className={`px-1 py-2 whitespace-nowrap text-center text-xs ${
                            isReserved
                              ? "bg-red-100 text-red-800 cursor-not-allowed"
                              : "bg-green-100 text-green-800 cursor-pointer hover:bg-green-200"
                          }`}
                          onClick={() => {
                            if (!isReserved) {
                              handleCellClick(
                                time,
                                table.id,
                                table.number.toString()
                              );
                            }
                          }}
                        >
                          {isReserved ? (
                            <span title={`${isReserved.customerName}`}>
                              Dolu
                            </span>
                          ) : (
                            "Müsait"
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
