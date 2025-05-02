import { supabase } from "@/config/supabase";
import type { User, Reservation, Company } from "@/models/types";
import { db } from "@/lib/supabase/client";

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
    reservation: Omit<Reservation, "id" | "created_at" | "updated_at">
  ): Promise<Reservation> {
    try {
      console.log("Rezervasyon oluşturuluyor:", reservation);

      // Eğer start_time verilmemişse date ve time'dan oluştur
      if (!reservation.start_time && reservation.date && reservation.time) {
        reservation.start_time = `${reservation.date}T${reservation.time}:00`;
      }

      // Eğer end_time verilmemişse start_time + 2 saat olarak ayarla
      if (!reservation.end_time && reservation.start_time) {
        const startDate = new Date(reservation.start_time);
        startDate.setHours(startDate.getHours() + 2);
        reservation.end_time = startDate.toISOString();
      }

      // Supabase rezervasyon işlemlerini kullan
      try {
        const result = await db.reservations.create({
          table_id: reservation.table_id,
          customer_name: reservation.customer_name,
          customer_phone: reservation.phone,
          customer_email: reservation.email,
          guest_count: reservation.guest_count,
          start_time: reservation.start_time || new Date().toISOString(),
          end_time: reservation.end_time || new Date().toISOString(),
          status: reservation.status,
          note: reservation.notes,
          created_by: reservation.user_id,
          company_id: reservation.company_id,
          branch_id: reservation.branch_id,
          color: reservation.color,
        });

        return {
          ...result,
          id: result.id,
          user_id: reservation.user_id,
          date: reservation.date || new Date().toISOString().split("T")[0],
          time:
            reservation.time ||
            new Date().toISOString().split("T")[1].substring(0, 5),
          notes: result.note,
          phone: result.customer_phone,
        } as unknown as Reservation;
      } catch (err) {
        console.error("Supabase rezervasyon oluşturma hatası:", err);
        throw err;
      }
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
      return data.map((res) => ({
        ...res,
        date: new Date(res.start_time || "").toISOString().split("T")[0],
        time: new Date(res.start_time || "")
          .toISOString()
          .split("T")[1]
          .substring(0, 5),
        notes: res.note,
      })) as Reservation[];
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
      await db.reservations.updateStatus(reservationId, status);
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
      const data = await db.reservations.getById(id);

      return {
        ...data,
        user_id: data.created_by || "",
        date: new Date(data.start_time).toISOString().split("T")[0],
        time: new Date(data.start_time)
          .toISOString()
          .split("T")[1]
          .substring(0, 5),
        notes: data.note || "",
        phone: data.customer_phone || "",
      } as unknown as Reservation;
    } catch (error) {
      console.error("Rezervasyon alma hatası:", error);
      return null;
    }
  }

  static async updateReservation(
    id: string,
    updates: Partial<Reservation>
  ): Promise<Reservation | null> {
    try {
      // Eğer start_time yoksa date ve time kullanarak oluştur
      if (!updates.start_time && updates.date && updates.time) {
        updates.start_time = `${updates.date}T${updates.time}:00`;
      }

      // Supabase veri yapısına dönüştür
      const supabaseUpdates = {
        customer_name: updates.customer_name,
        customer_phone: updates.phone,
        customer_email: updates.email,
        guest_count: updates.guest_count,
        start_time: updates.start_time,
        end_time: updates.end_time,
        status: updates.status,
        note: updates.notes,
        payment_status: updates.payment_status,
        color: updates.color,
        table_id: updates.table_id,
      };

      const data = await db.reservations.update(id, supabaseUpdates);

      return {
        ...data,
        user_id: data.created_by || "",
        date: new Date(data.start_time).toISOString().split("T")[0],
        time: new Date(data.start_time)
          .toISOString()
          .split("T")[1]
          .substring(0, 5),
        notes: data.note,
        phone: data.customer_phone,
      } as unknown as Reservation;
    } catch (error) {
      console.error("Rezervasyon güncelleme hatası:", error);
      return null;
    }
  }

  static async deleteReservation(id: string): Promise<boolean> {
    try {
      await db.reservations.delete(id);
      return true;
    } catch (error) {
      console.error("Rezervasyon silme hatası:", error);
      return false;
    }
  }

  static async getReservationsByDateRange(
    companyId: string,
    startDate: string,
    endDate: string
  ): Promise<Reservation[]> {
    try {
      const reservations = await db.reservations.getByDateRange(
        startDate,
        endDate
      );

      // Sadece şirkete ait olanları filtrele
      const companyReservations = reservations.filter(
        (r) => r.company_id === companyId
      );

      return companyReservations.map((res) => ({
        ...res,
        user_id: res.created_by || "",
        date: new Date(res.start_time).toISOString().split("T")[0],
        time: new Date(res.start_time)
          .toISOString()
          .split("T")[1]
          .substring(0, 5),
        notes: res.note,
        phone: res.customer_phone,
      })) as unknown as Reservation[];
    } catch (error) {
      console.error("Tarih aralığı rezervasyonlarını getirme hatası:", error);
      return [];
    }
  }
}
