import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

// GET - Sistem ayarlarını getir
export async function GET() {
  try {
    const { data: settings, error } = await supabase
      .from("settings")
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Ayarlar getirilirken hata:", error);
    return NextResponse.json(
      { error: "Ayarlar getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// POST - Sistem ayarlarını güncelle
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // Zorunlu alanları kontrol et
    if (
      !data.workingHours ||
      data.minPayment === undefined ||
      data.isSystemActive === undefined
    ) {
      return NextResponse.json(
        {
          error: "Çalışma saatleri, minimum ödeme ve sistem durumu gereklidir",
        },
        { status: 400 }
      );
    }

    // Ayarları güncelle
    const { data: settings, error } = await supabase
      .from("settings")
      .update(data)
      .eq("id", 1)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(settings, { status: 200 });
  } catch (error) {
    console.error("Ayarlar güncellenirken hata:", error);
    return NextResponse.json(
      { error: "Ayarlar güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
