import { supabase } from "@/config/supabase";
import type { User, Reservation, Company } from "@/models/types";

export class SupabaseService {
  static async getUser(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data;
  }

  static async createReservation(
    reservation: Omit<Reservation, "id" | "created_at">
  ): Promise<Reservation> {
    const { data, error } = await supabase
      .from("reservations")
      .insert([reservation])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getCompanyReservations(
    companyId: string
  ): Promise<Reservation[]> {
    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .eq("company_id", companyId);

    if (error) throw error;
    return data;
  }

  static async updateReservationStatus(
    reservationId: string,
    status: Reservation["status"]
  ): Promise<void> {
    const { error } = await supabase
      .from("reservations")
      .update({ status })
      .eq("id", reservationId);

    if (error) throw error;
  }

  static async getCompanyById(companyId: string): Promise<Company | null> {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .single();

    if (error) throw error;
    return data;
  }
}
