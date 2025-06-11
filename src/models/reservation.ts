"use client";

import { db } from "@/lib/firebase/config";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export class ReservationModel {
  static async update(id: string, data: Partial<any>) {
    try {
      const reservationRef = doc(db, "reservations", id);
      await updateDoc(reservationRef, data);
      return true;
    } catch (error) {
      console.error("Rezervasyon güncelleme hatası:", error);
      throw error;
    }
  }

  static async getById(id: string) {
    try {
      const reservationRef = doc(db, "reservations", id);
      const docSnap = await getDoc(reservationRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
        };
      }

      return null;
    } catch (error) {
      console.error("Rezervasyon getirme hatası:", error);
      throw error;
    }
  }
}
