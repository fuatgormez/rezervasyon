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
    try {
      console.log("Rezervasyon oluşturuluyor:", reservation);

      const { data, error } = await supabase
        .from("reservations")
        .insert([reservation])
        .select()
        .single();

      if (error) {
        console.error("Supabase rezervasyon oluşturma hatası:", error);
        throw error;
      }

      console.log("Rezervasyon başarıyla oluşturuldu:", data);
      return data;
    } catch (error) {
      console.error("Rezervasyon oluşturma hatası:", error);
      throw error;
    }
  }

  static async getCompanyReservations(
    companyId: string
  ): Promise<Reservation[]> {
    try {
      console.log("Şirket rezervasyonları getiriliyor:", companyId);

      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("company_id", companyId);

      if (error) {
        console.error("Rezervasyon getirme hatası:", error);
        throw error;
      }

      console.log(`${data?.length || 0} adet rezervasyon bulundu`);
      return data || [];
    } catch (error) {
      console.error("Rezervasyon getirme hatası:", error);
      return [];
    }
  }

  static async updateReservationStatus(
    reservationId: string,
    status: Reservation["status"]
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from("reservations")
        .update({ status })
        .eq("id", reservationId);

      if (error) throw error;
    } catch (error) {
      console.error("Rezervasyon durumu güncelleme hatası:", error);
      throw error;
    }
  }

  static async getCompanyById(companyId: string): Promise<Company | null> {
    try {
      // Önce companies tablosunda ara
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .single();

      // Şirket bulunamazsa veya hata oluşursa varsayılan bir şirket döndür
      if (error || !data) {
        console.log("Şirket bulunamadı, varsayılan şirket oluşturuluyor");
        return {
          id: companyId,
          name: "Varsayılan Şirket",
          created_at: new Date().toISOString(),
        };
      }

      return data;
    } catch (error) {
      console.error("Şirket getirme hatası:", error);
      // Varsayılan bir şirket döndür
      return {
        id: companyId,
        name: "Varsayılan Şirket",
        created_at: new Date().toISOString(),
      };
    }
  }

  // Reservation işlemleri
  static async getReservationById(id: string): Promise<Reservation | null> {
    try {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Rezervasyon alma hatası:", error);
      return null;
    }
  }

  static async updateReservation(
    id: string,
    updates: any
  ): Promise<Reservation | null> {
    try {
      const { data, error } = await supabase
        .from("reservations")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Rezervasyon güncelleme hatası:", error);
      return null;
    }
  }

  static async deleteReservation(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("reservations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Rezervasyon silme hatası:", error);
      return false;
    }
  }
}
