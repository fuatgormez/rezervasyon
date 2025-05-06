import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { reservationId, paymentAmount = 100 } = await request.json();

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
                value: (paymentAmount / 100).toFixed(2),
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
