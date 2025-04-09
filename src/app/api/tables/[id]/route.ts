import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb/connect";
import { Table } from "@/lib/mongodb/models/Table";

interface Params {
  params: {
    id: string;
  };
}

// GET - Belirli bir masayı getir
export async function GET(req: NextRequest, { params }: Params) {
  try {
    await connectToDatabase();

    // ID bir tamsayı olabilir (tableNumber)
    let table;

    if (!isNaN(Number(params.id))) {
      // Eğer ID bir sayı ise, tableNumber olarak ara
      table = await Table.findOne({ tableNumber: Number(params.id) });
    } else {
      // ObjectId olarak ara
      table = await Table.findById(params.id);
    }

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    return NextResponse.json({ table }, { status: 200 });
  } catch (error) {
    console.error("Error fetching table:", error);
    return NextResponse.json(
      { error: "Failed to fetch table" },
      { status: 500 }
    );
  }
}

// PUT - Masayı güncelle
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await connectToDatabase();

    const body = await req.json();

    // ID bir tamsayı olabilir (tableNumber)
    let table;

    if (!isNaN(Number(params.id))) {
      // Eğer ID bir sayı ise, tableNumber olarak ara
      table = await Table.findOne({ tableNumber: Number(params.id) });
    } else {
      // ObjectId olarak ara
      table = await Table.findById(params.id);
    }

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    // Güncelleme tarihini ayarla
    body.updatedAt = new Date();

    // Masayı güncelle
    const updatedTable = await Table.findByIdAndUpdate(
      table._id,
      { $set: body },
      { new: true, runValidators: true }
    );

    return NextResponse.json({ table: updatedTable }, { status: 200 });
  } catch (error) {
    console.error("Error updating table:", error);
    return NextResponse.json(
      { error: "Failed to update table" },
      { status: 500 }
    );
  }
}

// DELETE - Masayı sil
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await connectToDatabase();

    // ID bir tamsayı olabilir (tableNumber)
    let table;

    if (!isNaN(Number(params.id))) {
      // Eğer ID bir sayı ise, tableNumber olarak ara
      table = await Table.findOne({ tableNumber: Number(params.id) });
    } else {
      // ObjectId olarak ara
      table = await Table.findById(params.id);
    }

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    // Masayı sil
    await Table.findByIdAndDelete(table._id);

    return NextResponse.json(
      { message: "Table deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting table:", error);
    return NextResponse.json(
      { error: "Failed to delete table" },
      { status: 500 }
    );
  }
}
