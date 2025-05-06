import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

// Test rezervasyonlarını temizlemek için özel endpoint
export async function GET() {
  try {
    const { error } = await supabase
      .from("reservations")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (error) {
      throw error;
    }

    return new NextResponse(
      JSON.stringify({ message: "Tüm rezervasyonlar başarıyla temizlendi" }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Rezervasyonlar temizlenirken hata:", error);
    return new NextResponse(
      JSON.stringify({ error: "Rezervasyonlar temizlenirken bir hata oluştu" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
