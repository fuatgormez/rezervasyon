import { NextRequest, NextResponse } from "next/server";
import { ReservationModel } from "@/lib/kv";
import { ReservationType } from "@/lib/kv/models/reservation";
import { ReservationController } from "@/controllers/reservation.controller";

// GET - Tüm rezervasyonları getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const tableId = searchParams.get("tableId");
    const date = searchParams.get("date");
    const companyId = searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json(
        { error: "Company ID is required" },
        { status: 400 }
      );
    }

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
    const reservations = await ReservationController.getCompanyReservations(
      companyId
    );

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
    const { userId, companyId, date, time } = await request.json();

    if (!userId || !companyId || !date || !time) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const reservation = await ReservationController.createReservation(
      userId,
      companyId,
      date,
      time
    );

    return NextResponse.json(reservation);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
