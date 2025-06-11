import { NextRequest, NextResponse } from "next/server";
import { db } from "@/config/firebase";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  writeBatch,
  doc,
} from "firebase/firestore";

// GET - Tüm masaları getir
export async function GET() {
  try {
    // Firestore'dan tabloları çek
    const tablesRef = collection(db, "tables");
    const querySnapshot = await getDocs(tablesRef);

    const tables = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Eğer hiç masa yoksa, varsayılan masaları oluştur
    if (tables.length === 0) {
      const batch = writeBatch(db);
      const createdTables = [];

      // 10 adet varsayılan masa oluştur
      for (let i = 0; i < 10; i++) {
        const tableData = {
          number: i + 1,
          capacity: 4,
          status: "available",
        };

        const tableRef = doc(collection(db, "tables"));
        batch.set(tableRef, tableData);

        createdTables.push({
          id: tableRef.id,
          ...tableData,
        });
      }

      // Batch işlemini uygula
      await batch.commit();

      return NextResponse.json({ tables: createdTables });
    }

    return NextResponse.json({ tables });
  } catch (error) {
    console.error("Error fetching tables:", error);
    return NextResponse.json(
      { error: "Failed to fetch tables" },
      { status: 500 }
    );
  }
}

// POST - Yeni masa ekle
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Firestore'a yeni masa ekle
    const docRef = await addDoc(collection(db, "tables"), data);

    // Eklenen masayı getir
    const newTable = {
      id: docRef.id,
      ...data,
    };

    return NextResponse.json({
      message: "Table created successfully",
      table: newTable,
    });
  } catch (error) {
    console.error("Error creating table:", error);
    return NextResponse.json(
      { error: "Failed to create table" },
      { status: 500 }
    );
  }
}
