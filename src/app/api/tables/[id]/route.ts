import { NextRequest, NextResponse } from "next/server";
import { db } from "@/config/firebase";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Firestore'dan masa bilgisini getir
    const tableRef = doc(db, "tables", id);
    const tableSnap = await getDoc(tableRef);

    if (!tableSnap.exists()) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const table = {
      id: tableSnap.id,
      ...tableSnap.data(),
    };

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

    // Firestore'da masayı güncelle
    const tableRef = doc(db, "tables", id);
    await updateDoc(tableRef, updates);

    // Güncellenmiş masayı getir
    const updatedTableSnap = await getDoc(tableRef);

    if (!updatedTableSnap.exists()) {
      return NextResponse.json(
        { error: "Table not found after update" },
        { status: 404 }
      );
    }

    const updatedTable = {
      id: updatedTableSnap.id,
      ...updatedTableSnap.data(),
    };

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

    // Firestore'dan masayı sil
    const tableRef = doc(db, "tables", id);
    await deleteDoc(tableRef);

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
