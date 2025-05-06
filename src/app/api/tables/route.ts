import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

// GET - Tüm masaları getir
export async function GET() {
  try {
    const { data: tables, error } = await supabase.from("tables").select("*");

    if (error) {
      throw error;
    }

    // Eğer hiç masa yoksa, varsayılan masaları oluştur
    if (tables.length === 0) {
      const defaultTables = Array.from({ length: 10 }, (_, i) => ({
        id: `t${i + 1}`,
        number: i + 1,
        capacity: 4,
        status: "available",
      }));

      const { data: createdTables, error: createError } = await supabase
        .from("tables")
        .insert(defaultTables)
        .select();

      if (createError) {
        throw createError;
      }

      return NextResponse.json({ tables: createdTables });
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
    const { data: newTable, error } = await supabase
      .from("tables")
      .insert(data)
      .select()
      .single();

    if (error) {
      throw error;
    }

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
