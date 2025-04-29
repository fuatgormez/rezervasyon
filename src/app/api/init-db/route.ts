import { NextResponse } from "next/server";
import { supabase } from "@/config/supabase";

export async function GET() {
  try {
    console.log("Supabase bağlantısı test ediliyor...");

    // Supabase bağlantısını test et
    try {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .limit(1);
      console.log("Mevcut rezervasyonlar:", data);

      if (error) {
        console.error("Supabase sorgu hatası:", error);
      }

      // Tabloyu oluşturmaya çalış
      await supabase.from("reservations").insert({
        user_id: "test-user",
        company_id: "test-company",
        date: "2025-04-30",
        time: "12:00",
        customer_name: "Test Müşteri",
        guest_count: 2,
        status: "pending",
      });

      return NextResponse.json({
        success: true,
        message: "Test rezervasyonu başarıyla oluşturuldu",
      });
    } catch (error) {
      console.error("Supabase test hatası:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Supabase bağlantısı başarısız oldu",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Genel hata:", error);
    return NextResponse.json(
      {
        error: "İşlem başarısız oldu",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
