import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb/connect";
import { Reservation } from "@/lib/mongodb/models/Reservation";

export async function GET() {
  try {
    console.log("MongoDB bağlantısı başlatılıyor...");
    const db = await connectDB();
    console.log("MongoDB bağlantısı başarılı:", db ? "Evet" : "Hayır");

    console.log("Test verisi oluşturuluyor...");
    const testReservation = await Reservation.create({
      customer: {
        name: "Test Müşteri",
        email: "test@example.com",
        phone: "5551234567",
      },
      date: new Date(),
      time: "12:00",
      guests: 2,
      tableNumber: 1,
      payment: {
        amount: 200,
        status: "pending",
      },
      status: "pending",
    });

    console.log("Test verisi oluşturuldu:", testReservation);

    return NextResponse.json({
      success: true,
      message: "Test verisi başarıyla oluşturuldu",
      data: testReservation,
    });
  } catch (error: any) {
    console.error("Test verisi oluşturma hatası:", error.message);
    return NextResponse.json(
      {
        error: "Test verisi oluşturulurken bir hata oluştu",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
