import { NextRequest, NextResponse } from "next/server";
import {
  getAllTables,
  createTable,
  initializeDefaultTables,
} from "@/lib/kv/tables";

// GET - Tüm masaları getir
export async function GET() {
  try {
    let tables = await getAllTables();

    // Eğer hiç masa yoksa, varsayılan masaları oluştur
    if (tables.length === 0) {
      tables = await initializeDefaultTables();
    }

    return NextResponse.json({ tables });
  } catch (error) {
    console.error("Error fetching tables:", error);
    return NextResponse.json(
      { error: "Failed to fetch tables" },
      { status: 500 }
    );
  }
}

// POST - Yeni masa ekle
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Yeni masa oluştur
    const newTable = await createTable(data);

    return NextResponse.json({
      message: "Table created successfully",
      table: newTable,
    });
  } catch (error) {
    console.error("Error creating table:", error);
    return NextResponse.json(
      { error: "Failed to create table" },
      { status: 500 }
    );
  }
}
