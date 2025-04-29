import { NextRequest, NextResponse } from "next/server";
import { SupabaseService } from "@/services/supabase.service";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const reservation = await SupabaseService.getReservationById(id);

    if (!reservation) {
      return NextResponse.json(
        { error: "Rezervasyon bulunamadı" },
        { status: 404 }
      );
    }

    return NextResponse.json({ reservation });
  } catch (error) {
    console.error(`Rezervasyon getirme hatası ${params.id}:`, error);
    return NextResponse.json(
      { error: "Rezervasyon getirilemedi" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const updates = await request.json();

    const updatedReservation = await SupabaseService.updateReservation(
      id,
      updates
    );

    if (!updatedReservation) {
      return NextResponse.json(
        { error: "Rezervasyon bulunamadı" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Rezervasyon başarıyla güncellendi",
      reservation: updatedReservation,
    });
  } catch (error) {
    console.error(`Rezervasyon güncelleme hatası ${params.id}:`, error);
    return NextResponse.json(
      { error: "Rezervasyon güncellenemedi" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    await SupabaseService.deleteReservation(id);

    return NextResponse.json({
      message: "Rezervasyon başarıyla silindi",
    });
  } catch (error) {
    console.error(`Rezervasyon silme hatası ${params.id}:`, error);
    return NextResponse.json(
      { error: "Rezervasyon silinemedi" },
      { status: 500 }
    );
  }
}
