import { NextResponse } from "next/server";
import { TableModel, CompanySettingsModel } from "@/lib/kv";

export async function GET() {
  try {
    let tablesCreated = false;
    let settingsCreated = false;

    // Varsayılan masaları oluştur
    try {
      await TableModel.initializeDefaultTables();
      tablesCreated = true;
    } catch (err) {
      console.error("Masa oluşturma hatası:", err);
    }

    // Şirket ayarlarını oluştur/getir
    try {
      const settings = await CompanySettingsModel.getSettings();
      settingsCreated = !!settings;
    } catch (err) {
      console.error("Ayar oluşturma hatası:", err);
    }

    return NextResponse.json({
      success: true,
      tablesCreated,
      settingsCreated,
      message: "Vercel KV başarıyla başlatıldı",
    });
  } catch (error) {
    console.error("Veritabanı başlatma hatası:", error);
    return NextResponse.json(
      {
        error: "Veritabanı başlatılamadı",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
