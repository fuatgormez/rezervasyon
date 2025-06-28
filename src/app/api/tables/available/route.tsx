import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase/config";
import { ref, get, query, orderByChild, equalTo } from "firebase/database";

// Masa tipi
interface Table {
  id: string;
  number: number;
  tableName?: string;
  minCapacity?: number;
  maxCapacity?: number;
  capacity: number;
  location?: string;
  categoryId?: string;
  category_id?: string;
  status?: string;
  isAvailableForCustomers?: boolean;
  description?: string;
  restaurantId?: string;
}

// Rezervasyon veri tipi
interface Reservation {
  id: string;
  tableId?: string;
  table_id?: string;
  date: string;
  time?: string;
  startTime?: string;
  endTime?: string;
  guestCount?: number;
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

    // Realtime Database'den tüm masaları getir
    const tablesRef = ref(db, "tables");
    const tablesSnapshot = await get(tablesRef);

    let tables: Table[] = [];
    if (tablesSnapshot.exists()) {
      const tablesData = tablesSnapshot.val();
      tables = Object.entries(tablesData).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      })) as Table[];
    }

    // Seçilen tarih için rezervasyonları getir
    const reservationsRef = ref(db, "reservations");
    const reservationsSnapshot = await get(reservationsRef);

    let reservations: Reservation[] = [];
    if (reservationsSnapshot.exists()) {
      const reservationsData = reservationsSnapshot.val();
      reservations = Object.entries(reservationsData)
        .map(([id, data]: [string, any]) => ({
          id,
          ...data,
        }))
        .filter(
          (reservation: any) => reservation.date === date
        ) as Reservation[];
    }

    // Müsait masaları filtrele
    const availableTables = tables.filter((table) => {
      // Müşteri erişim kontrolü - sadece müşterilere açık masalar
      if (table.isAvailableForCustomers === false) {
        return false;
      }

      // Kapasite kontrolü - min/max kapasite varsa onları kullan
      const minCap = table.minCapacity || table.capacity || 1;
      const maxCap = table.maxCapacity || table.capacity || 10;

      if (guests < minCap || guests > maxCap) {
        return false;
      }

      // Rezervasyon kontrolü
      const tableReservations = reservations.filter(
        (reservation) =>
          (reservation.tableId || reservation.table_id) === table.id
      );

      return !tableReservations.some((reservation) => {
        const reservationTime = new Date(
          reservation.startTime || `${date}T${reservation.time || "00:00"}`
        );
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
