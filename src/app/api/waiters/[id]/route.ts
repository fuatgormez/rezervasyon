import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: {
    id: string;
  };
}

// GET - ID'ye göre garson bilgisi getir
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // KV şu anda garson modeli içermiyor, ileride eklenecek
    // Şimdilik boş nesne dönelim
    return NextResponse.json({
      id: params.id,
      name: "Örnek Garson",
      status: "active",
    });
  } catch (error) {
    console.error(`Garson bilgisi getirilirken hata (${params.id}):`, error);
    return NextResponse.json(
      { error: "Garson bilgisi getirilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// PATCH - Garson bilgilerini güncelle
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const data = await request.json();

    // KV şu anda garson modeli içermiyor, ileride eklenecek
    // Şimdilik gönderilen veriyi ID eklenerek dönelim
    return NextResponse.json({
      ...data,
      id: params.id,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Garson güncellenirken hata (${params.id}):`, error);
    return NextResponse.json(
      { error: "Garson güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// DELETE - Garson sil
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // KV şu anda garson modeli içermiyor, ileride eklenecek
    // Şimdilik başarılı yanıt dönelim
    return NextResponse.json({
      message: "Garson başarıyla silindi",
      id: params.id,
    });
  } catch (error) {
    console.error(`Garson silinirken hata (${params.id}):`, error);
    return NextResponse.json(
      { error: "Garson silinirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
