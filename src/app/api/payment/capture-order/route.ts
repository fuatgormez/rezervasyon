import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb/connect";
import { Reservation } from "@/lib/mongodb/models/Reservation";

export async function POST(request: Request) {
  try {
    await connectDB();

    const { orderId, reservationId } = await request.json();

    // PayPal'dan ödemeyi yakala
    const response = await fetch(
      `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.PAYPAL_ACCESS_TOKEN}`,
        },
      }
    );

    const paypalData = await response.json();

    if (paypalData.status === "COMPLETED") {
      // Rezervasyonu güncelle
      await Reservation.findByIdAndUpdate(reservationId, {
        "payment.status": "completed",
        "payment.paypalTransactionId": paypalData.id,
        status: "confirmed",
      });

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: "Ödeme tamamlanamadı" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("PayPal ödeme yakalama hatası:", error);
    return NextResponse.json(
      { error: "Ödeme işlemi tamamlanırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
