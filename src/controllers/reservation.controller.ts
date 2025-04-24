import { SupabaseService } from "@/services/supabase.service";
import type { Reservation } from "@/models/types";

export class ReservationController {
  static async createReservation(
    userId: string,
    companyId: string,
    date: string,
    time: string
  ): Promise<Reservation> {
    // Şirketin var olduğunu kontrol et
    const company = await SupabaseService.getCompanyById(companyId);
    if (!company) {
      throw new Error("Company not found");
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
      status: "pending",
    });

    return reservation;
  }

  static async updateReservationStatus(
    reservationId: string,
    status: Reservation["status"]
  ): Promise<void> {
    await SupabaseService.updateReservationStatus(reservationId, status);
  }

  static async getCompanyReservations(
    companyId: string
  ): Promise<Reservation[]> {
    return await SupabaseService.getCompanyReservations(companyId);
  }
}
