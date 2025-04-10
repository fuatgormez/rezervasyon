import { NextResponse } from "next/server";
import { ReservationModel } from "@/lib/kv";

export async function POST(request: Request) {
  try {
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
      // Rezervasyonu güncelle - sadece statüsünü değiştir, ödeme bilgisini ayrıca saklamıyoruz
      await ReservationModel.update(reservationId, {
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
