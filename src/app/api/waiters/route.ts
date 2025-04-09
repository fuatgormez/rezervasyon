import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb/connect";
import { Waiter } from "@/lib/mongodb/models/Waiter";

// GET - Tüm garsonları getir
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    // URL'den section parametresini al (opsiyonel)
    const { searchParams } = new URL(req.url);
    const section = searchParams.get("section");

    const query = section ? { section } : {};

    const waiters = await Waiter.find(query).sort({ name: 1 });

    return NextResponse.json({ waiters }, { status: 200 });
  } catch (error) {
    console.error("Error fetching waiters:", error);
    return NextResponse.json(
      { error: "Failed to fetch waiters" },
      { status: 500 }
    );
  }
}

// POST - Yeni garson ekle
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();

    // Zorunlu alanları kontrol et
    if (!body.name || !body.section) {
      return NextResponse.json(
        { error: "Name and section are required" },
        { status: 400 }
      );
    }

    // Yeni garson oluştur
    const newWaiter = await Waiter.create({
      name: body.name,
      section: body.section,
      phone: body.phone || "",
      email: body.email || "",
      status: body.status || "active",
      assignedTables: body.assignedTables || [],
    });

    return NextResponse.json({ waiter: newWaiter }, { status: 201 });
  } catch (error) {
    console.error("Error creating waiter:", error);
    return NextResponse.json(
      { error: "Failed to create waiter" },
      { status: 500 }
    );
  }
}
