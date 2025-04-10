import { NextResponse } from "next/server";
import { ReservationModel } from "@/lib/kv";

export async function GET() {
  try {
    console.log("Vercel KV bağlantısı testi başlatılıyor...");

    console.log("Test verisi oluşturuluyor...");
    const testReservation = await ReservationModel.create({
      customerId: `cust_test_${Date.now()}`,
      customerName: "Test Müşteri",
      tableId: "t1",
      startTime: "12:00",
      endTime: "14:00",
      guests: 2,
      status: "confirmed",
      type: "RESERVATION",
      phone: "5551234567",
      isNewGuest: true,
      language: "TR",
    });

    console.log("Test verisi oluşturuldu:", testReservation);

    return NextResponse.json({
      success: true,
      message: "Test verisi başarıyla oluşturuldu",
      data: testReservation,
    });
  } catch (error: unknown) {
    console.error(
      "Test verisi oluşturma hatası:",
      error instanceof Error ? error.message : String(error)
    );
    return NextResponse.json(
      {
        error: "Test verisi oluşturulurken bir hata oluştu",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
