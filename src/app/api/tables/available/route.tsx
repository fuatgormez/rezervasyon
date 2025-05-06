import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

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
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const time = searchParams.get("time");
    const guests = parseInt(searchParams.get("guests") || "1");

    if (!date || !time) {
      return new NextResponse(
        JSON.stringify({ error: "Tarih ve saat parametreleri gerekli" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Tüm masaları getir
    const { data: tables, error: tablesError } = await supabase
      .from("tables")
      .select("*");

    if (tablesError) {
      throw tablesError;
    }

    // Seçilen tarih için rezervasyonları getir
    const { data: reservations, error: reservationsError } = await supabase
      .from("reservations")
      .select("*")
      .eq("date", date);

    if (reservationsError) {
      throw reservationsError;
    }

    // Müsait masaları filtrele
    const availableTables = tables.filter((table) => {
      // Kapasite kontrolü
      if (table.capacity < guests) {
        return false;
      }

      // Rezervasyon kontrolü
      const tableReservations = reservations.filter(
        (reservation) => reservation.table_id === table.id
      );

      return !tableReservations.some((reservation) => {
        const reservationTime = new Date(reservation.time);
        const requestedTime = new Date(`${date}T${time}`);
        const timeDiff = Math.abs(
          reservationTime.getTime() - requestedTime.getTime()
        );
        return timeDiff < 2 * 60 * 60 * 1000; // 2 saat
      });
    });

    return new NextResponse(JSON.stringify(availableTables), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Müsait masaları getirirken hata:", error);
    return new NextResponse(
      JSON.stringify({ error: "Müsait masalar getirilemedi" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
