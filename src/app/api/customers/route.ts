import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb/connect";
import { Customer } from "@/lib/mongodb/models/Customer";

export async function GET() {
  try {
    await connectToDatabase();
    const customers = await Customer.find({}).sort({ createdAt: -1 });
    return NextResponse.json(customers);
  } catch (error) {
    console.error("Müşteriler yüklenirken hata:", error);
    return NextResponse.json(
      { error: "Müşteriler yüklenemedi" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await connectToDatabase();

    const customer = new Customer({
      ...body,
      rating: {
        stars: 0,
        reservationCount: 0,
        isBlacklisted: false,
        badges: [],
      },
    });

    await customer.save();
    return NextResponse.json(customer);
  } catch (error) {
    console.error("Müşteri eklenirken hata:", error);
    return NextResponse.json({ error: "Müşteri eklenemedi" }, { status: 500 });
  }
}
