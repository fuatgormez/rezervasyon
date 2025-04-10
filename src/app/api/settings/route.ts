import { NextRequest, NextResponse } from "next/server";
import { CompanySettingsModel } from "@/lib/kv";

// GET - Sistem ayarlarını getir
export async function GET() {
  try {
    const settings = await CompanySettingsModel.getSettings();

    return NextResponse.json(settings, { status: 200 });
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
    const settings = await CompanySettingsModel.updateSettings(data);

    return NextResponse.json(settings, { status: 200 });
  } catch (error) {
    console.error("Ayarlar güncellenirken hata:", error);
    return NextResponse.json(
      { error: "Ayarlar güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
