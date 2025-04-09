import { NextRequest, NextResponse } from "next/server";
import {
  getAllReservations,
  createReservation,
  isTableAvailable,
} from "@/lib/kv";
import { Reservation } from "@/lib/kv";

// GET - Tüm rezervasyonları getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const tableId = searchParams.get("tableId");
    const startTimeStr = searchParams.get("startTime");

    let reservations = await getAllReservations();

    // Filtreleme
    if (status) {
      reservations = reservations.filter((res) => res.status === status);
    }

    if (type) {
      reservations = reservations.filter((res) => res.type === type);
    }

    if (tableId) {
      reservations = reservations.filter((res) => res.tableId === tableId);
    }

    if (startTimeStr) {
      const startTime = new Date(startTimeStr);
      const endTime = new Date(startTime);
      endTime.setHours(23, 59, 59, 999);

      reservations = reservations.filter((res) => {
        const resTime = new Date(res.startTime);
        return resTime >= startTime && resTime <= endTime;
      });
    }

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
    const requiredFields = ["tableId", "startTime", "duration"];
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
    const startTime = new Date(data.startTime);
    const hours = startTime.getHours();

    if (hours < 9 || hours >= 23) {
      return NextResponse.json(
        {
          error: "Reservations can only be made between 9:00 AM and 11:00 PM",
        },
        { status: 400 }
      );
    }

    // Masa müsaitliğini kontrol et
    const isAvailable = await isTableAvailable(
      data.tableId,
      startTime,
      data.duration
    );

    if (!isAvailable) {
      return NextResponse.json(
        {
          error: "The selected table is not available for the specified time",
        },
        { status: 400 }
      );
    }

    // Rezervasyon oluştur
    const reservationData: Partial<Reservation> = {
      ...data,
      status: data.status || "pending",
      type: data.type || "RESERVATION",
    };

    const newReservation = await createReservation(reservationData);

    return NextResponse.json({
      message: "Reservation created successfully",
      reservation: newReservation,
    });
  } catch (error) {
    console.error("POST reservation error:", error);
    return NextResponse.json(
      { error: "Failed to create reservation" },
      { status: 500 }
    );
  }
}
