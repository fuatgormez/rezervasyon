import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb/connect";
import { Reservation } from "@/lib/mongodb/models/Reservation";

// Next.js 15 ile uyumlu route handler
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status } = body;

    await connectDB();
    const reservation = await Reservation.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!reservation) {
      return NextResponse.json(
        { error: "Rezervasyon bulunamadı" },
        { status: 404 }
      );
    }

    return NextResponse.json(reservation);
  } catch (error) {
    console.error("Rezervasyon güncellenirken hata:", error);
    return NextResponse.json(
      { error: "Rezervasyon güncellenemedi" },
      { status: 500 }
    );
  }
}
