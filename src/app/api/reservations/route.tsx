import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

// Rezervasyon veri tipi
interface Reservation {
  id: string;
  tableId: string;
  customerName: string;
  customerPhone: string;
  date: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  status: "confirmed" | "pending" | "cancelled";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Demo amaçlı bazı rezervasyonlar (gerçek uygulamada veritabanından gelecek)
const reservations: Reservation[] = [
  {
    id: "1",
    tableId: "t1",
    customerName: "Mehmet Yılmaz",
    customerPhone: "5551234567",
    date: "2023-12-15",
    startTime: "19:00",
    endTime: "21:00",
    guestCount: 2,
    status: "confirmed",
    notes: "Pencere kenarı tercih edildi",
    createdAt: "2023-12-10T12:00:00Z",
    updatedAt: "2023-12-10T12:00:00Z",
  },
  {
    id: "2",
    tableId: "t2",
    customerName: "Ayşe Kaya",
    customerPhone: "5559876543",
    date: "2023-12-15",
    startTime: "20:00",
    endTime: "22:00",
    guestCount: 4,
    status: "confirmed",
    createdAt: "2023-12-11T10:30:00Z",
    updatedAt: "2023-12-11T10:30:00Z",
  },
];

// GET - Tüm rezervasyonları getir (opsiyonel filtrelerle)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get("date");
    const tableId = searchParams.get("tableId");
    const status = searchParams.get("status") as
      | "confirmed"
      | "pending"
      | "cancelled"
      | null;

    // Filtreleri uygula
    let filteredReservations = [...reservations];

    if (date) {
      filteredReservations = filteredReservations.filter(
        (res) => res.date === date
      );
    }

    if (tableId) {
      filteredReservations = filteredReservations.filter(
        (res) => res.tableId === tableId
      );
    }

    if (status) {
      filteredReservations = filteredReservations.filter(
        (res) => res.status === status
      );
    }

    return NextResponse.json({
      success: true,
      count: filteredReservations.length,
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

// POST - Yeni rezervasyon oluştur
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Gerekli alanlar kontrol ediliyor
    const {
      tableId,
      customerName,
      customerPhone,
      date,
      startTime,
      endTime,
      guestCount,
    } = body;

    if (
      !tableId ||
      !customerName ||
      !customerPhone ||
      !date ||
      !startTime ||
      !endTime ||
      !guestCount
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Eksik rezervasyon bilgileri",
        },
        { status: 400 }
      );
    }

    // Burada masa kontrolü yapıp, rezervasyon çakışması kontrolü yapılabilir
    // Gerçek uygulamada bu kontroller veritabanı sorguları ile yapılacak

    // Aynı masa için aynı tarihte çakışan rezervasyon var mı kontrolü
    const hasConflict = reservations.some((res) => {
      if (
        res.tableId !== tableId ||
        res.date !== date ||
        res.status === "cancelled"
      ) {
        return false;
      }

      const newStartMinutes = timeToMinutes(startTime);
      const newEndMinutes = timeToMinutes(endTime);
      const existingStartMinutes = timeToMinutes(res.startTime);
      const existingEndMinutes = timeToMinutes(res.endTime);

      // Gece yarısını geçen rezervasyonlar için özel kontrol
      if (newEndMinutes < newStartMinutes) {
        // Yeni rezervasyon gece yarısını geçiyor (örn. 22:00-01:00)
        if (existingEndMinutes < existingStartMinutes) {
          // Mevcut rezervasyon da gece yarısını geçiyor
          return true; // Bu durumda her zaman çakışma vardır
        } else {
          // Mevcut rezervasyon normal (örn. 18:00-20:00)
          return (
            existingStartMinutes < newEndMinutes ||
            existingEndMinutes > newStartMinutes
          );
        }
      } else if (existingEndMinutes < existingStartMinutes) {
        // Mevcut rezervasyon gece yarısını geçiyor, yeni rezervasyon normal
        return (
          newStartMinutes < existingEndMinutes ||
          newEndMinutes > existingStartMinutes
        );
      }

      // Normal durum - her iki rezervasyon da gece yarısını geçmiyor
      return (
        newStartMinutes < existingEndMinutes &&
        newEndMinutes > existingStartMinutes
      );
    });

    if (hasConflict) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bu masa için belirtilen tarih ve saatte rezervasyon bulunmaktadır",
        },
        { status: 409 }
      );
    }

    // Yeni rezervasyon oluştur
    const newReservation: Reservation = {
      id: uuidv4(),
      tableId,
      customerName,
      customerPhone,
      date,
      startTime,
      endTime,
      guestCount: Number(guestCount),
      status: body.status || "confirmed",
      notes: body.notes || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Rezervasyonu kaydet (gerçekte veritabanına kaydedilecek)
    reservations.push(newReservation);

    return NextResponse.json(
      {
        success: true,
        message: "Rezervasyon başarıyla oluşturuldu",
        reservation: newReservation,
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

// PUT - Rezervasyon güncelle
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Rezervasyon ID gereklidir",
        },
        { status: 400 }
      );
    }

    // Rezervasyonu bul
    const reservationIndex = reservations.findIndex((res) => res.id === id);

    if (reservationIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: "Rezervasyon bulunamadı",
        },
        { status: 404 }
      );
    }

    // Çakışma kontrolü - sadece tarih, saat veya masa değişiyorsa
    if (
      (updateData.date ||
        updateData.startTime ||
        updateData.endTime ||
        updateData.tableId) &&
      updateData.status !== "cancelled"
    ) {
      const updatedReservation = {
        ...reservations[reservationIndex],
        ...updateData,
      };

      const hasConflict = reservations.some((res) => {
        // Kendisi hariç kontrol et
        if (res.id === id || res.status === "cancelled") return false;

        // Masa değişmediyse veya aynı masaya rezerve ediliyorsa
        if (
          res.tableId !== updatedReservation.tableId ||
          res.date !== updatedReservation.date
        ) {
          return false;
        }

        const newStartMinutes = timeToMinutes(updatedReservation.startTime);
        const newEndMinutes = timeToMinutes(updatedReservation.endTime);
        const existingStartMinutes = timeToMinutes(res.startTime);
        const existingEndMinutes = timeToMinutes(res.endTime);

        // Zaman çakışması kontrolü (gece yarısı kontrolü dahil)
        if (
          newEndMinutes < newStartMinutes ||
          existingEndMinutes < existingStartMinutes
        ) {
          // Gece yarısını geçen durumlar için özel kontrol gerekir
          // Basitleştirmek için, bu durumda çakışma var kabul ediyoruz
          return true;
        }

        return (
          newStartMinutes < existingEndMinutes &&
          newEndMinutes > existingStartMinutes
        );
      });

      if (hasConflict) {
        return NextResponse.json(
          {
            success: false,
            error: "Güncellenen rezervasyon başka bir rezervasyonla çakışıyor",
          },
          { status: 409 }
        );
      }
    }

    // Rezervasyonu güncelle
    reservations[reservationIndex] = {
      ...reservations[reservationIndex],
      ...updateData,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: "Rezervasyon başarıyla güncellendi",
      reservation: reservations[reservationIndex],
    });
  } catch (error) {
    console.error("Rezervasyon güncellenirken hata:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Rezervasyon güncellenirken bir hata oluştu",
      },
      { status: 500 }
    );
  }
}

// DELETE - Rezervasyon sil (gerçekte genellikle iptal edilir, silinmez)
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Rezervasyon ID gereklidir",
        },
        { status: 400 }
      );
    }

    // Rezervasyonu bul
    const reservationIndex = reservations.findIndex((res) => res.id === id);

    if (reservationIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: "Rezervasyon bulunamadı",
        },
        { status: 404 }
      );
    }

    // Rezervasyonu iptal et (gerçekte statü değiştirilir, silinmez)
    reservations[reservationIndex].status = "cancelled";
    reservations[reservationIndex].updatedAt = new Date().toISOString();

    return NextResponse.json({
      success: true,
      message: "Rezervasyon başarıyla iptal edildi",
    });
  } catch (error) {
    console.error("Rezervasyon iptal edilirken hata:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Rezervasyon iptal edilirken bir hata oluştu",
      },
      { status: 500 }
    );
  }
}

// Yardımcı fonksiyon: Saat formatını dakika cinsine çevirir
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}
