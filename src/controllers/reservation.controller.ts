import { SupabaseService } from "@/services/supabase.service";
import type { Reservation } from "@/models/types";
import { format } from "date-fns";

export class ReservationController {
  static async createReservation(
    userId: string,
    companyId: string,
    date: string,
    time: string,
    additionalData: any = {}
  ): Promise<Reservation> {
    try {
      console.log("Controller: Rezervasyon oluşturuluyor", {
        userId,
        companyId,
        date,
        time,
        ...additionalData,
      });

      // Şirketin var olduğunu kontrol et
      const company = await SupabaseService.getCompanyById(companyId);
      if (!company) {
        throw new Error("Şirket bulunamadı");
      }

      // Kullanıcının var olduğunu kontrol et
      const user = await SupabaseService.getUser(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Rezervasyon oluştur
      const reservation = await SupabaseService.createReservation({
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
      });

      return reservation;
    } catch (error) {
      console.error("Controller: Rezervasyon oluşturma hatası", error);
      throw error;
    }
  }

  static async updateReservationStatus(
    reservationId: string,
    status: Reservation["status"]
  ): Promise<void> {
    await SupabaseService.updateReservationStatus(reservationId, status);
  }

  static async getCompanyReservations(
    companyId: string,
    date?: Date
  ): Promise<Reservation[]> {
    try {
      const reservations = await SupabaseService.getCompanyReservations(
        companyId
      );

      if (date) {
        const formattedDate = format(date, "yyyy-MM-dd");
        return reservations.filter(
          (reservation) => reservation.date === formattedDate
        );
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
  ): Promise<Reservation[]> {
    try {
      const reservations = await SupabaseService.getCompanyReservations(
        companyId
      );

      const formattedStartDate = format(startDate, "yyyy-MM-dd");
      const formattedEndDate = format(endDate, "yyyy-MM-dd");

      return reservations.filter(
        (reservation) =>
          reservation.date >= formattedStartDate &&
          reservation.date <= formattedEndDate
      );
    } catch (error) {
      console.error("Tarih aralığı rezervasyonlarını getirme hatası:", error);
      return [];
    }
  }
}
