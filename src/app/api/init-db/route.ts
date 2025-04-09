import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb/connect";
import { Table } from "@/lib/mongodb/models/Table";
import { CompanySettings } from "@/lib/mongodb/models/CompanySettings";

export async function GET() {
  try {
    await connectToDatabase();

    // Table koleksiyonunu başlat
    const { Table } = await import("@/lib/mongodb/models/Table");

    // CompanySettings koleksiyonunu başlat
    const { CompanySettings } = await import(
      "@/lib/mongodb/models/CompanySettings"
    );

    let tablesCreated = false;
    let settingsCreated = false;

    // Varsayılan masaları oluştur
    if (typeof Table.initializeDefaultTables === "function") {
      tablesCreated = await Table.initializeDefaultTables();
    }

    // Şirket ayarlarını oluştur/getir
    if (typeof CompanySettings.getSettings === "function") {
      const settings = await CompanySettings.getSettings();
      settingsCreated = !!settings;
    }

    return NextResponse.json({
      success: true,
      tablesCreated,
      settingsCreated,
      message: "Veritabanı başarıyla başlatıldı",
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
