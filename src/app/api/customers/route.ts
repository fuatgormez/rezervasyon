import { NextResponse } from "next/server";

// Müşteri listesini getir
export async function GET() {
  try {
    // KV şu anda müşteri modeli içermiyor, ileride eklenecek
    // Şimdilik boş dizi dönelim
    return NextResponse.json([]);
  } catch (error) {
    console.error("Müşteriler yüklenirken hata:", error);
    return NextResponse.json(
      { error: "Müşteriler yüklenemedi" },
      { status: 500 }
    );
  }
}

// Yeni müşteri ekle
export async function POST(request: Request) {
  try {
    const data = await request.json();

    // KV şu anda müşteri modeli içermiyor, ileride eklenecek
    // Şimdilik gelen veriyi ID ekleyerek dönelim
    const customer = {
      ...data,
      id: `cust_${Date.now()}`,
      createdAt: new Date().toISOString(),
      rating: {
        stars: 0,
        reservationCount: 0,
        isBlacklisted: false,
        badges: [],
      },
    };

    return NextResponse.json(customer);
  } catch (error) {
    console.error("Müşteri eklenirken hata:", error);
    return NextResponse.json({ error: "Müşteri eklenemedi" }, { status: 500 });
  }
}
