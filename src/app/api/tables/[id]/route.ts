import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const { data: table, error } = await supabase
      .from("tables")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw error;
    }

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

    const { data: updatedTable, error } = await supabase
      .from("tables")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

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
    const { error } = await supabase.from("tables").delete().eq("id", id);

    if (error) {
      throw error;
    }

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
