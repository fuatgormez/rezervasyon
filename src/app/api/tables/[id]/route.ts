import { NextRequest, NextResponse } from "next/server";
import {
  getTableById,
  updateTable,
  deleteTable,
} from "../../../../lib/kv/tables";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const table = await getTableById(id);

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    return NextResponse.json({ table });
  } catch (error) {
    console.error(`Error fetching table ${params.id}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch table" },
      { status: 500 }
    );
  }
}

// PATCH - Masayı güncelle
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const updates = await request.json();

    const updatedTable = await updateTable(id, updates);

    return NextResponse.json({
      message: "Table updated successfully",
      table: updatedTable,
    });
  } catch (error) {
    console.error(`Error updating table ${params.id}:`, error);
    return NextResponse.json(
      { error: "Failed to update table" },
      { status: 500 }
    );
  }
}

// DELETE - Masayı sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    await deleteTable(id);

    return NextResponse.json({
      message: "Table deleted successfully",
    });
  } catch (error) {
    console.error(`Error deleting table ${params.id}:`, error);
    return NextResponse.json(
      { error: "Failed to delete table" },
      { status: 500 }
    );
  }
}
