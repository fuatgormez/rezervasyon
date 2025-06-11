import { NextResponse } from "next/server";
import { db } from "@/config/firebase";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";

export const dynamic = "force-dynamic";

// Test rezervasyonlarını temizlemek için özel endpoint
export async function GET() {
  try {
    // Tüm rezervasyonları getir
    const reservationsRef = collection(db, "reservations");
    const querySnapshot = await getDocs(reservationsRef);

    // Batch işlemi başlat
    const batch = writeBatch(db);

    // Her rezervasyonu silme işlemine ekle
    querySnapshot.forEach((document) => {
      batch.delete(doc(db, "reservations", document.id));
    });

    // Batch işlemini gerçekleştir
    await batch.commit();

    return new NextResponse(
      JSON.stringify({ message: "Tüm rezervasyonlar başarıyla temizlendi" }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Rezervasyonlar temizlenirken hata:", error);
    return new NextResponse(
      JSON.stringify({ error: "Rezervasyonlar temizlenirken bir hata oluştu" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
