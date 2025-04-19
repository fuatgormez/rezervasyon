import { NextRequest, NextResponse } from "next/server";

// Test rezervasyonlarını temizlemek için özel endpoint
export async function GET(request: NextRequest) {
  try {
    // Gerçek API'de veritabanında işlem yapılır, bu sadece localStorage için bir simülasyon
    return NextResponse.json({
      success: true,
      message:
        "Tüm rezervasyonlar temizlendi. Sayfayı yenilemek için localStorage'ı temizleyin.",
    });
  } catch (error) {
    console.error("Rezervasyonlar temizlenirken hata:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Rezervasyonlar temizlenirken bir hata oluştu",
      },
      { status: 500 }
    );
  }
}
