import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb/connect";
import { Waiter } from "@/lib/mongodb/models/Waiter";

interface Params {
  params: {
    id: string;
  };
}

// GET - Belirli bir garsonu getir
export async function GET(req: NextRequest, { params }: Params) {
  try {
    await connectToDatabase();

    const waiter = await Waiter.findById(params.id);

    if (!waiter) {
      return NextResponse.json({ error: "Waiter not found" }, { status: 404 });
    }

    return NextResponse.json({ waiter }, { status: 200 });
  } catch (error) {
    console.error("Error fetching waiter:", error);
    return NextResponse.json(
      { error: "Failed to fetch waiter" },
      { status: 500 }
    );
  }
}

// PUT - Garsonu güncelle
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await connectToDatabase();

    const body = await req.json();

    // Garson var mı kontrol et
    const waiter = await Waiter.findById(params.id);

    if (!waiter) {
      return NextResponse.json({ error: "Waiter not found" }, { status: 404 });
    }

    // Güncelleme tarihini ayarla
    body.updatedAt = new Date();

    // Garsonu güncelle
    const updatedWaiter = await Waiter.findByIdAndUpdate(
      params.id,
      { $set: body },
      { new: true, runValidators: true }
    );

    return NextResponse.json({ waiter: updatedWaiter }, { status: 200 });
  } catch (error) {
    console.error("Error updating waiter:", error);
    return NextResponse.json(
      { error: "Failed to update waiter" },
      { status: 500 }
    );
  }
}

// DELETE - Garsonu sil
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await connectToDatabase();

    // Garson var mı kontrol et
    const waiter = await Waiter.findById(params.id);

    if (!waiter) {
      return NextResponse.json({ error: "Waiter not found" }, { status: 404 });
    }

    // Garsonu sil
    await Waiter.findByIdAndDelete(params.id);

    return NextResponse.json(
      { message: "Waiter deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting waiter:", error);
    return NextResponse.json(
      { error: "Failed to delete waiter" },
      { status: 500 }
    );
  }
}
