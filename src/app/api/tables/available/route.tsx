import { NextRequest, NextResponse } from "next/server";

// Masa tipi
interface Table {
  id: string;
  number: number;
  capacity: number;
  location: string;
  categoryId: string;
}

// Rezervasyon veri tipi
interface Reservation {
  id: string;
  tableId: string;
  date: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  status: "confirmed" | "pending" | "cancelled";
}

// Gerçek veritabanına geçene kadar tüm masaların statik listesi
const allTables: Table[] = [
  { id: "t1", number: 1, capacity: 2, location: "TERAS", categoryId: "1" },
  { id: "t2", number: 2, capacity: 4, location: "TERAS", categoryId: "1" },
  { id: "t3", number: 3, capacity: 6, location: "TERAS", categoryId: "1" },
  { id: "t4", number: 4, capacity: 8, location: "TERAS", categoryId: "1" },
  { id: "t5", number: 5, capacity: 2, location: "TERAS", categoryId: "1" },
  { id: "b1", number: 6, capacity: 2, location: "BAHÇE", categoryId: "2" },
  { id: "b2", number: 7, capacity: 4, location: "BAHÇE", categoryId: "2" },
  { id: "b3", number: 8, capacity: 6, location: "BAHÇE", categoryId: "2" },
  { id: "b4", number: 9, capacity: 8, location: "BAHÇE", categoryId: "2" },
  { id: "i1", number: 10, capacity: 2, location: "İÇ SALON", categoryId: "3" },
  { id: "i2", number: 11, capacity: 4, location: "İÇ SALON", categoryId: "3" },
  { id: "i3", number: 12, capacity: 6, location: "İÇ SALON", categoryId: "3" },
  { id: "i4", number: 13, capacity: 8, location: "İÇ SALON", categoryId: "3" },
];

// GET - Müsait masaları getir
export async function GET(request: NextRequest) {
  try {
    // URL parametrelerini al
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get("date");
    const time = searchParams.get("time");
    const guestsStr = searchParams.get("guests");

    // Parametreleri kontrol et
    if (!date || !time) {
      return NextResponse.json(
        {
          success: false,
          error: "Eksik parametreler: tarih ve saat gereklidir",
        },
        { status: 400 }
      );
    }

    const guests = guestsStr ? parseInt(guestsStr) : 1;

    // Burada gerçek bir veritabanından rezervasyonları sorgulayacağız
    // Şimdilik boş bir array olarak simüle ediyoruz, gerçekte veritabanı sorgulanacak
    const existingReservations: Reservation[] = [];

    // Gerçek uygulamada, bu fonksiyon veritabanındaki rezervasyonları kontrol edecek
    // ve belirtilen tarih/saatte rezerve edilmiş masaları belirleyecek
    const getReservedTableIds = (date: string, time: string): string[] => {
      // Örnek implementasyon - gerçekte veritabanı sorgusu olacak
      return existingReservations
        .filter((res) => {
          if (res.date !== date) return false;
          if (res.status === "cancelled") return false;

          // Zaman kontrolü - istenilen saat, rezervasyon zaman aralığında mı?
          const requestHour = parseInt(time.split(":")[0]);
          const requestMinute = parseInt(time.split(":")[1] || "0");
          const requestTimeInMinutes = requestHour * 60 + requestMinute;

          const startHour = parseInt(res.startTime.split(":")[0]);
          const startMinute = parseInt(res.startTime.split(":")[1] || "0");
          const startTimeInMinutes = startHour * 60 + startMinute;

          const endHour = parseInt(res.endTime.split(":")[0]);
          const endMinute = parseInt(res.endTime.split(":")[1] || "0");
          const endTimeInMinutes = endHour * 60 + endMinute;

          // Gece yarısını geçen rezervasyonlar için özel durum kontrolü
          if (endTimeInMinutes < startTimeInMinutes) {
            // 23:00 - 01:00 gibi durumlar
            return (
              requestTimeInMinutes >= startTimeInMinutes ||
              requestTimeInMinutes <= endTimeInMinutes
            );
          }

          return (
            requestTimeInMinutes >= startTimeInMinutes &&
            requestTimeInMinutes < endTimeInMinutes
          );
        })
        .map((res) => res.tableId);
    };

    // Rezerve edilmiş masaları bul
    const reservedTableIds = getReservedTableIds(date, time);

    // Uygun masaları filtrele (rezervasyonu olmayan ve kapasitesi yeterli olanlar)
    const availableTables = allTables
      .filter((table) => !reservedTableIds.includes(table.id))
      .filter((table) => table.capacity >= guests)
      .map((table) => ({
        id: table.id,
        number: table.number,
        capacity: table.capacity,
        location: table.location,
      }));

    // Müsait masa yoksa uygun bir mesaj döndür
    if (availableTables.length === 0) {
      return NextResponse.json({
        success: false,
        message: `${date} tarihinde ${time} saatinde ${guests} kişi için uygun masa bulunamadı.`,
        tables: [],
      });
    }

    // Başarılı yanıt ile masaları döndür
    return NextResponse.json({
      success: true,
      message: `${availableTables.length} müsait masa bulundu.`,
      tables: availableTables,
    });
  } catch (error) {
    console.error("Müsait masaları getirirken hata:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Masa bilgileri alınırken bir hata oluştu",
      },
      { status: 500 }
    );
  }
}
