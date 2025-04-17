import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

// Rezervasyon tipi
interface Reservation {
  id: string;
  customerId?: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  tableId: string;
  date: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  status: "confirmed" | "pending" | "cancelled";
  specialRequests?: string;
  createdAt: string;
  sessionId?: string;
}

// Test için rezervasyon veri deposu
const reservations: Reservation[] = [];

// POST - Yeni rezervasyon oluştur
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Gerekli alanları kontrol et
    if (
      !data.customer?.name ||
      !data.startTime ||
      !data.date ||
      !data.guestCount
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Eksik bilgi. İsim, tarih, saat ve kişi sayısı gereklidir.",
        },
        { status: 400 }
      );
    }

    // Bitiş saati hesapla (varsayılan 2 saat)
    const calculateEndTime = (startTime: string, durationHours = 2): string => {
      const [hours, minutes] = startTime.split(":").map(Number);
      const endHour = (hours + durationHours) % 24;
      return `${String(endHour).padStart(2, "0")}:${String(minutes).padStart(
        2,
        "0"
      )}`;
    };

    // Masa seçimi algoritması - gerçek uygulamada daha karmaşık olacaktır
    // Burada basit bir algoritma kullanıyoruz:
    // 1. Müsait ve yeterli kapasiteye sahip bir masa bul
    // 2. Eğer belirli bir masa tercihi varsa ve uygunsa onu kullan
    const assignTable = (
      guestCount: number,
      tablePreference?: string
    ): string => {
      // Bu değişkenler gerçek uygulamada bir veritabanından gelecektir
      const tables = [
        {
          id: "t1",
          number: 1,
          capacity: 2,
          location: "TERAS",
          available: true,
        },
        {
          id: "t2",
          number: 2,
          capacity: 4,
          location: "TERAS",
          available: true,
        },
        {
          id: "t3",
          number: 3,
          capacity: 6,
          location: "TERAS",
          available: true,
        },
        {
          id: "b1",
          number: 6,
          capacity: 2,
          location: "BAHÇE",
          available: true,
        },
        {
          id: "b2",
          number: 7,
          capacity: 4,
          location: "BAHÇE",
          available: true,
        },
        {
          id: "i1",
          number: 10,
          capacity: 2,
          location: "İÇ SALON",
          available: true,
        },
        {
          id: "i4",
          number: 13,
          capacity: 8,
          location: "İÇ SALON",
          available: true,
        },
      ];

      // Eğer masa tercihi varsa ve uygunsa onu kullan
      if (tablePreference) {
        const preferredTable = tables.find((t) => t.id === tablePreference);
        if (
          preferredTable &&
          preferredTable.available &&
          preferredTable.capacity >= guestCount
        ) {
          return preferredTable.id;
        }
      }

      // Uygun bir masa bul
      const suitableTable = tables.find(
        (t) => t.available && t.capacity >= guestCount
      );
      if (suitableTable) {
        return suitableTable.id;
      }

      // Uygun masa bulunamadıysa en büyük masayı ata
      const largestTable = [...tables].sort(
        (a, b) => b.capacity - a.capacity
      )[0];
      return largestTable.id;
    };

    // Yeni rezervasyon oluştur
    const newReservation: Reservation = {
      id: randomUUID(),
      customer: {
        name: data.customer.name,
        email: data.customer.email || "",
        phone: data.customer.phone || "",
      },
      tableId:
        data.tableId || assignTable(data.guestCount, data.tablePreference),
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime || calculateEndTime(data.startTime, data.duration),
      guestCount: data.guestCount,
      status: "pending",
      specialRequests: data.specialRequests,
      createdAt: new Date().toISOString(),
      sessionId: data.sessionId,
    };

    // Rezervasyonu kaydet (gerçek uygulamada veritabanına kaydedilir)
    reservations.push(newReservation);

    // WebSocket üzerinden admin paneline bildirim gönder
    // Bu kısım gerçek uygulamada Socket.IO veya başka bir gerçek zamanlı
    // iletişim teknolojisi kullanılarak yapılacaktır
    console.log("Yeni rezervasyon bildirimi gönderildi:", newReservation.id);

    // Başarılı yanıt döndür
    return NextResponse.json(
      {
        success: true,
        message: "Rezervasyon başarıyla oluşturuldu",
        reservation: newReservation,
        tableId: newReservation.tableId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Rezervasyon oluşturulurken hata:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Rezervasyon oluşturulurken bir hata oluştu",
      },
      { status: 500 }
    );
  }
}

// GET - Rezervasyonları listele
export async function GET(request: NextRequest) {
  try {
    // URL parametrelerini al
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get("date");
    const tableId = searchParams.get("tableId");

    // Filtreleme uygula
    let filteredReservations = [...reservations];

    if (date) {
      filteredReservations = filteredReservations.filter(
        (r) => r.date === date
      );
    }

    if (tableId) {
      filteredReservations = filteredReservations.filter(
        (r) => r.tableId === tableId
      );
    }

    // Tarihe göre sırala
    filteredReservations.sort((a, b) => {
      // Önce tarihe göre
      const dateComparison =
        new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateComparison !== 0) return dateComparison;

      // Sonra saate göre
      const timeA = a.startTime.split(":").map(Number);
      const timeB = b.startTime.split(":").map(Number);

      const minutesA = timeA[0] * 60 + timeA[1];
      const minutesB = timeB[0] * 60 + timeB[1];

      return minutesA - minutesB;
    });

    return NextResponse.json({
      success: true,
      reservations: filteredReservations,
    });
  } catch (error) {
    console.error("Rezervasyonlar alınırken hata:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Rezervasyonlar alınırken bir hata oluştu",
      },
      { status: 500 }
    );
  }
}
