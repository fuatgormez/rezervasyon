"use client";

import { FirebaseService } from "@/services/firebase.service";
import type { Reservation } from "@/models/types";
import { format } from "date-fns";

export class ReservationController {
  static async createReservation(
    userId: string,
    companyId: string,
    date: string,
    time: string,
    additionalData: any = {}
  ): Promise<any> {
    try {
      console.log("Controller: Rezervasyon oluşturuluyor", {
        userId,
        companyId,
        date,
        time,
        ...additionalData,
      });

      // Rezervasyon verilerini hazırla
      const reservationData = {
        user_id: userId,
        company_id: companyId,
        date,
        time,
        status: additionalData.status || "pending",
        customer_name: additionalData.customer_name || "",
        guest_count: additionalData.guest_count || 1,
        phone: additionalData.phone || "",
        email: additionalData.email || "",
        notes: additionalData.notes || "",
        table_id: additionalData.table_id || null,
        end_time: additionalData.end_time || null,
      };

      // Firebase ile rezervasyon oluştur
      const reservation = await FirebaseService.createReservation(
        reservationData
      );

      return reservation;
    } catch (error) {
      console.error("Controller: Rezervasyon oluşturma hatası", error);
      throw error;
    }
  }

  static async updateReservationStatus(
    reservationId: string,
    status: string
  ): Promise<void> {
    await FirebaseService.updateReservationStatus(reservationId, status);
  }

  static async getCompanyReservations(
    companyId: string,
    date?: Date
  ): Promise<any[]> {
    try {
      let reservations;

      if (date) {
        const formattedDate = format(date, "yyyy-MM-dd");
        reservations = await FirebaseService.getCompanyReservations(
          companyId,
          formattedDate
        );
      } else {
        reservations = await FirebaseService.getCompanyReservations(companyId);
      }

      return reservations;
    } catch (error) {
      console.error("Rezervasyonları getirme hatası:", error);
      return [];
    }
  }

  static async getReservationsByDateRange(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    try {
      const formattedStartDate = format(startDate, "yyyy-MM-dd");
      const formattedEndDate = format(endDate, "yyyy-MM-dd");

      const reservations = await FirebaseService.getReservationsByDateRange(
        companyId,
        formattedStartDate,
        formattedEndDate
      );

      return reservations;
    } catch (error) {
      console.error("Tarih aralığı rezervasyonlarını getirme hatası:", error);
      return [];
    }
  }
}
