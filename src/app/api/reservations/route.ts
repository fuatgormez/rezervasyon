import { NextRequest, NextResponse } from "next/server";
import { ReservationModel } from "@/lib/kv";
import { ReservationType } from "@/lib/kv/models/reservation";

// GET - Tüm rezervasyonları getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const tableId = searchParams.get("tableId");
    const date = searchParams.get("date");

    // Filtreleri hazırla
    const filters: {
      status?: string;
      type?: string;
      tableId?: string;
      date?: string;
    } = {};

    if (status) filters.status = status;
    if (type) filters.type = type;
    if (tableId) filters.tableId = tableId;
    if (date) filters.date = date;

    // Vercel KV ile veri çek
    const reservations = await ReservationModel.getAll(filters);

    return NextResponse.json({ reservations });
  } catch (error) {
    console.error("GET reservations error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservations" },
      { status: 500 }
    );
  }
}

// POST - Yeni rezervasyon ekle
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Zorunlu alanları kontrol et
    const requiredFields = [
      "tableId",
      "startTime",
      "endTime",
      "guests",
      "customerName",
    ];
    const missingFields = requiredFields.filter((field) => !data[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required fields: ${missingFields.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Rezervasyon zamanını kontrol et - işletme saatlerinin 9:00 - 23:00 olduğunu varsayalım
    const startTimeParts = data.startTime.split(":");
    const hours = parseInt(startTimeParts[0], 10);

    if (hours < 9 && hours >= 23) {
      return NextResponse.json(
        {
          error: "Rezervasyonlar sadece 9:00 ve 23:00 arasında yapılabilir",
        },
        { status: 400 }
      );
    }

    // Masa müsaitliğini kontrol et
    const isAvailable = await ReservationModel.isTableAvailable(
      data.tableId,
      data.startTime,
      data.endTime
    );

    if (!isAvailable) {
      return NextResponse.json(
        {
          error: "Seçilen masa belirtilen saatlerde müsait değil",
        },
        { status: 400 }
      );
    }

    // Rezervasyon nesnesi oluştur
    const reservationData: Omit<ReservationType, "id"> = {
      customerId: data.customerId || `cust_${Date.now()}`,
      customerName: data.customerName,
      tableId: data.tableId,
      startTime: data.startTime,
      endTime: data.endTime,
      guests: data.guests,
      status: data.status || "confirmed",
      type: data.type || "RESERVATION",
      phone: data.phone,
      isNewGuest: data.isNewGuest,
      language: data.language,
      color: data.color,
    };

    // Yeni rezervasyon oluştur
    const newReservation = await ReservationModel.create(reservationData);

    return NextResponse.json({
      message: "Rezervasyon başarıyla oluşturuldu",
      reservation: newReservation,
    });
  } catch (error) {
    console.error("POST reservation error:", error);
    return NextResponse.json(
      { error: "Rezervasyon oluşturulamadı" },
      { status: 500 }
    );
  }
}
