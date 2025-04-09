"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { io } from "socket.io-client";

const reservationSchema = z.object({
  name: z.string().min(2, "İsim en az 2 karakter olmalıdır"),
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  phone: z.string().min(10, "Geçerli bir telefon numarası giriniz"),
  date: z.string(),
  time: z.string(),
  guests: z
    .number()
    .min(1, "En az 1 kişi seçmelisiniz")
    .max(10, "En fazla 10 kişi seçebilirsiniz"),
});

type ReservationFormData = z.infer<typeof reservationSchema>;

export default function ReservationForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null);
  const formSessionId = useRef<string>(Date.now().toString());

  // Socket.IO bağlantısı
  useEffect(() => {
    // Tarayıcı tarafında olduğundan emin ol
    if (typeof window === "undefined") return;

    // Socket.IO bağlantısı kur
    const socketInstance = io();
    setSocket(socketInstance);

    // Component unmount olduğunda bağlantıyı kapat
    return () => {
      // Rezervasyon iptal edildi bilgisi gönder (form tamamlanmadan sayfadan ayrılındı)
      socketInstance.emit("reservation:cancel", {
        sessionId: formSessionId.current,
        cancelReason: "form_abandoned",
      });
      socketInstance.disconnect();
    };
  }, []);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
  } = useForm<ReservationFormData>({
    resolver: zodResolver(reservationSchema),
    mode: "onChange",
  });

  // Form alanlarını izle
  const name = useWatch({ control, name: "name" });
  const time = useWatch({ control, name: "time" });
  const guests = useWatch({ control, name: "guests" });

  // Form alanları değiştiğinde bildirim gönder
  useEffect(() => {
    if (!socket || !isDirty) return;

    // Rezervasyon formu doldurulma aşamasında
    if (name || time || guests) {
      socket.emit("reservation:typing", {
        sessionId: formSessionId.current,
        formData: {
          customerName: name || "İsimsiz Müşteri",
          startTime: time || "Saat seçilmedi",
          guests: guests || 0,
          status: "filling_form",
        },
        lastUpdate: new Date().toISOString(),
      });
    }
  }, [socket, name, time, guests, isDirty]);

  // Form tamamlandığında yeni rezervasyonu kaydet
  const onSubmit = async (data: ReservationFormData) => {
    setIsLoading(true);
    try {
      // Eşzamanlı rezervasyon bildirimi için Socket.IO kullan
      if (socket) {
        // Önceden bildirim gönder
        socket.emit("reservation:start", {
          sessionId: formSessionId.current,
          customerName: data.name,
          tableId: 0, // Henüz atanmadı
          startTime: data.time,
          guests: data.guests,
          type: "RESERVATION",
          status: "pending_approval",
        });
      }

      console.log("Rezervasyon gönderiliyor:", {
        customer: {
          name: data.name,
          email: data.email,
          phone: data.phone,
        },
        startTime: data.time,
        date: data.date,
        guests: data.guests,
        tableId: 0, // Boş bir masa otomatik atanacak
        duration: 2, // Varsayılan 2 saat
        sessionId: formSessionId.current,
      });

      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer: {
            name: data.name,
            email: data.email,
            phone: data.phone,
          },
          startTime: data.time,
          date: data.date,
          guests: data.guests,
          tableId: 0, // Boş bir masa otomatik atanacak
          duration: 2, // Varsayılan 2 saat
          sessionId: formSessionId.current,
          checkMinPayment: false, // Ön ödemesiz rezervasyon için kontrolü atla
        }),
      });

      const responseData = await response.json();
      console.log("API yanıtı:", responseData);

      if (!response.ok) {
        // Ayrıntılı hata mesajı al
        const errorMessage =
          responseData.error || "Rezervasyon oluşturulurken bir hata oluştu";
        throw new Error(errorMessage);
      }

      // Masa numarasını al
      const tableId =
        responseData.tableId || responseData.reservation?.tableId || 0;

      // Rezervasyon tamamlandı bildirimi
      if (socket) {
        socket.emit("reservation:complete", {
          sessionId: formSessionId.current,
          customerName: data.name,
          status: "completed",
          tableId: tableId,
        });
      }

      // Başarı mesajı göster
      alert(
        `Rezervasyonunuz başarıyla alındı! ${
          tableId ? `${tableId} numaralı masa için ` : ""
        }Onay için bekleniyor...`
      );

      // PayPal ödeme sayfasına yönlendir (varsa)
      if (responseData.paymentUrl) {
        window.location.href = responseData.paymentUrl;
      } else {
        // Form alanlarını sıfırla
        window.location.reload();
      }
    } catch (error) {
      console.error("Rezervasyon hatası:", error);

      // Rezervasyon hata bildirimi
      if (socket) {
        socket.emit("reservation:cancel", {
          sessionId: formSessionId.current,
          customerName: data.name,
          cancelReason: "error_during_submit",
          error: error instanceof Error ? error.message : "Bilinmeyen hata",
        });
      }

      // Kullanıcı dostu hata mesajı göster
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Rezervasyon oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.";

      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">Rezervasyon Yap</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            İsim Soyisim
          </label>
          <input
            type="text"
            {...register("name")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            E-posta
          </label>
          <input
            type="email"
            {...register("email")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Telefon
          </label>
          <input
            type="tel"
            {...register("phone")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Tarih
          </label>
          <input
            type="date"
            {...register("date")}
            min={format(new Date(), "yyyy-MM-dd")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.date && (
            <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Saat
          </label>
          <select
            {...register("time")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Saat Seçin</option>
            {Array.from({ length: 9 }, (_, i) => i + 12).map((hour) => (
              <option key={hour} value={`${hour}:00`}>
                {`${hour}:00`}
              </option>
            ))}
          </select>
          {errors.time && (
            <p className="mt-1 text-sm text-red-600">{errors.time.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Kişi Sayısı
          </label>
          <select
            {...register("guests", { valueAsNumber: true })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Kişi Sayısı Seçin</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
              <option key={num} value={num}>
                {num} Kişi
              </option>
            ))}
          </select>
          {errors.guests && (
            <p className="mt-1 text-sm text-red-600">{errors.guests.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isLoading ? "İşleniyor..." : "Rezervasyon Yap"}
        </button>
      </form>
    </div>
  );
}
