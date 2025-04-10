import { NextResponse } from "next/server";

// GET - Tüm garsonları getir
export async function GET() {
  try {
    // KV şu anda garson modeli içermiyor, ileride eklenecek
    // Şimdilik boş dizi dönelim
    return NextResponse.json([]);
  } catch (error) {
    console.error("Garsonlar getirilirken hata:", error);
    return NextResponse.json(
      { error: "Garsonlar getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// POST - Yeni garson ekle
export async function POST(request: Request) {
  try {
    // KV şu anda garson modeli içermiyor, ileride eklenecek
    // Şimdilik gelen veriyi olduğu gibi dönelim
    const data = await request.json();
    return NextResponse.json(
      { ...data, id: `waiter_${Date.now()}` },
      { status: 201 }
    );
  } catch (error) {
    console.error("Garson oluşturulurken hata:", error);
    return NextResponse.json(
      { error: "Garson oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}
