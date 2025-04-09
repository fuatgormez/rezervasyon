import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb/connect";
import { CompanySettings } from "@/lib/mongodb/models/CompanySettings";

// GET - Sistem ayarlarını getir
export async function GET() {
  try {
    await connectToDatabase();

    // @ts-expect-error - CompanySettings içindeki getSettings metodu için tip hatası bekleniyor
    const settings = await CompanySettings.getSettings();

    return NextResponse.json({ settings }, { status: 200 });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// POST - Sistem ayarlarını güncelle
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();

    // Zorunlu alanları kontrol et
    if (
      !body.workingHours ||
      body.minPayment === undefined ||
      body.isSystemActive === undefined
    ) {
      return NextResponse.json(
        {
          error:
            "Working hours, minimum payment and system status are required",
        },
        { status: 400 }
      );
    }

    // Ayarları al veya oluştur
    // @ts-expect-error - CompanySettings içindeki getSettings metodu için tip hatası bekleniyor
    const settings = await CompanySettings.getSettings();

    // Ayarları güncelle
    settings.workingHours = body.workingHours;
    settings.minPayment = body.minPayment;
    settings.isSystemActive = body.isSystemActive;
    settings.customTimeSlots = body.customTimeSlots || [];
    settings.updatedAt = new Date();

    // Ayarları kaydet
    await settings.save();

    return NextResponse.json({ settings }, { status: 200 });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
