import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Varsayılan masaları oluştur
    const defaultTables = Array.from({ length: 10 }, (_, i) => ({
      id: `table-${i + 1}`,
      number: i + 1,
      capacity: Math.floor(Math.random() * 4) + 2, // 2-6 arası kapasite
      status: "available",
    }));

    const { error: tablesError } = await supabase
      .from("tables")
      .upsert(defaultTables, { onConflict: "id" });

    if (tablesError) {
      throw tablesError;
    }

    // Varsayılan ayarları oluştur
    const defaultSettings = {
      id: "default",
      working_hours: {
        start: "09:00",
        end: "22:00",
      },
      min_payment: 100,
      is_active: true,
    };

    const { error: settingsError } = await supabase
      .from("settings")
      .upsert(defaultSettings, { onConflict: "id" });

    if (settingsError) {
      throw settingsError;
    }

    return new NextResponse(
      JSON.stringify({ message: "Veritabanı başarıyla başlatıldı" }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Veritabanı başlatılırken hata:", error);
    return new NextResponse(
      JSON.stringify({ error: "Veritabanı başlatılırken bir hata oluştu" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
