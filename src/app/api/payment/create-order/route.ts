import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb/connect";
import { Reservation } from "@/lib/mongodb/models/Reservation";

export async function POST(request: Request) {
  try {
    await connectDB();

    const { reservationId } = await request.json();

    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return NextResponse.json(
        { error: "Rezervasyon bulunamadı" },
        { status: 404 }
      );
    }

    // PayPal API'si ile sipariş oluştur
    const response = await fetch(
      "https://api-m.sandbox.paypal.com/v2/checkout/orders",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.PAYPAL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            {
              amount: {
                currency_code: "TRY",
                value: (reservation.payment.amount / 100).toFixed(2),
              },
              description: `Rezervasyon #${reservationId}`,
            },
          ],
        }),
      }
    );

    const order = await response.json();

    return NextResponse.json(order);
  } catch (error) {
    console.error("PayPal sipariş oluşturma hatası:", error);
    return NextResponse.json(
      { error: "Ödeme işlemi başlatılırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
