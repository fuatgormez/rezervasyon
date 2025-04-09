import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb/connect";
import { Table } from "@/lib/mongodb/models/Table";

// GET - Tüm masaları getir
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    // URL'den filtreleme parametrelerini al
    const { searchParams } = new URL(req.url);
    const section = searchParams.get("section");
    const status = searchParams.get("status");
    const capacity = searchParams.get("capacity");
    const isActive = searchParams.get("isActive");

    // Filtreleme sorgusu oluştur
    const query: Record<string, unknown> = {};

    if (section) query.section = section;
    if (status) query.status = status;
    if (capacity) query.capacity = capacity;
    if (isActive !== null) query.isActive = isActive === "true";

    // Sıralama için masa numarasını kullan
    const tables = await Table.find(query).sort({ tableNumber: 1 });

    return NextResponse.json({ tables }, { status: 200 });
  } catch (error) {
    console.error("Error fetching tables:", error);
    return NextResponse.json(
      { error: "Failed to fetch tables" },
      { status: 500 }
    );
  }
}

// POST - Yeni masa ekle
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();

    // Zorunlu alanları kontrol et
    if (!body.tableNumber || !body.capacity || !body.section) {
      return NextResponse.json(
        { error: "Table number, capacity and section are required" },
        { status: 400 }
      );
    }

    // Aynı numaralı masa var mı kontrol et
    const existingTable = await Table.findOne({
      tableNumber: body.tableNumber,
    });
    if (existingTable) {
      return NextResponse.json(
        { error: "A table with this number already exists" },
        { status: 400 }
      );
    }

    // Yeni masa oluştur
    const newTable = await Table.create({
      tableNumber: body.tableNumber,
      capacity: body.capacity,
      section: body.section,
      status: body.status || "available",
      minimumSpend: body.minimumSpend || 0,
      isActive: body.isActive !== undefined ? body.isActive : true,
      position: body.position || { x: 0, y: 0 },
    });

    return NextResponse.json({ table: newTable }, { status: 201 });
  } catch (error) {
    console.error("Error creating table:", error);
    return NextResponse.json(
      { error: "Failed to create table" },
      { status: 500 }
    );
  }
}
