import { NextRequest, NextResponse } from "next/server";
import { ReservationController } from "@/controllers/reservation.controller";
import type { Reservation } from "@/models/types";

// GET - Tüm rezervasyonları getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!companyId) {
      return NextResponse.json(
        { error: "Company ID is required" },
        { status: 400 }
      );
    }

    let reservations: Reservation[] = [];

    try {
      if (startDate && endDate) {
        // Tarih aralığına göre rezervasyonları getir
        reservations = await ReservationController.getReservationsByDateRange(
          companyId,
          new Date(startDate),
          new Date(endDate)
        );
      } else if (date) {
        // Belirli bir tarihe göre rezervasyonları getir
        reservations = await ReservationController.getCompanyReservations(
          companyId,
          new Date(date)
        );
      } else {
        // Tüm rezervasyonları getir
        reservations = await ReservationController.getCompanyReservations(
          companyId
        );
      }
    } catch (error) {
      console.error("Rezervasyonlar alınamadı:", error);
      return NextResponse.json(
        { error: "Rezervasyonlar alınamadı: " + (error as Error).message },
        { status: 500 }
      );
    }

    return NextResponse.json({ reservations });
  } catch (error: any) {
    console.error("GET reservations error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch reservations" },
      { status: 500 }
    );
  }
}

// POST - Yeni rezervasyon ekle
export async function POST(request: NextRequest) {
  try {
    const {
      user_id,
      company_id,
      date,
      time,
      customer_name,
      guest_count,
      phone,
      email,
      table_id,
      end_time,
      notes,
      status,
    } = await request.json();

    if (!user_id || !company_id || !date || !time) {
      return NextResponse.json(
        { error: "Gerekli alanlar eksik" },
        { status: 400 }
      );
    }

    console.log("Rezervasyon verileri:", {
      user_id,
      company_id,
      date,
      time,
      customer_name,
      guest_count,
      phone,
      email,
      table_id,
      end_time,
      notes,
      status,
    });

    const reservation = await ReservationController.createReservation(
      user_id,
      company_id,
      date,
      time,
      {
        customer_name,
        guest_count,
        phone,
        email,
        table_id,
        end_time,
        notes,
        status: status || "pending",
      }
    );

    return NextResponse.json(reservation);
  } catch (error: any) {
    console.error("Rezervasyon oluşturma hatası:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
