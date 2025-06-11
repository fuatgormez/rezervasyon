import { NextRequest, NextResponse } from "next/server";
import { FirebaseService } from "@/services/firebase.service";

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

    let reservations: any[] = [];

    try {
      if (startDate && endDate) {
        // Tarih aralığına göre rezervasyonları getir
        reservations = await FirebaseService.getReservationsByDateRange(
          companyId,
          startDate,
          endDate
        );
      } else if (date) {
        // Belirli bir tarihe göre rezervasyonları getir
        reservations = await FirebaseService.getCompanyReservations(
          companyId,
          date
        );
      } else {
        // Tüm rezervasyonları getir
        reservations = await FirebaseService.getCompanyReservations(companyId);
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
    const reservationData = await request.json();

    // Gerekli alanların kontrolü
    if (
      !reservationData.user_id ||
      !reservationData.company_id ||
      !reservationData.date ||
      !reservationData.time
    ) {
      return NextResponse.json(
        { error: "Gerekli alanlar eksik" },
        { status: 400 }
      );
    }

    console.log("Rezervasyon verileri:", reservationData);

    // Firebase servisini kullanarak rezervasyon oluştur
    const reservation = await FirebaseService.createReservation(
      reservationData
    );

    return NextResponse.json(reservation);
  } catch (error: any) {
    console.error("Rezervasyon oluşturma hatası:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
