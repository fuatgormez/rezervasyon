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

      // Benzersiz ID oluştur
      const reservationId = `res-${Date.now()}-${Math.floor(
        Math.random() * 1000
      )}`;
      console.log("Oluşturulan rezervasyon ID'si:", reservationId);

      // Eğer start_time verilmemişse date ve time'dan oluştur
      if (!reservation.start_time && reservation.date && reservation.time) {
        // Tarih ve saat bilgisini ISO formatında birleştir - Z eklemeden (yerel saat)
        const dateTimeStr = `${reservation.date}T${reservation.time}:00`;
        console.log("Oluşturulan tarih-saat:", dateTimeStr);

        // Doğrudan ISO formatında string olarak ata (Z olmadan)
        reservation.start_time = dateTimeStr;
      }

      // Eğer end_time verilmemişse start_time + 2 saat olarak ayarla
      if (!reservation.end_time && reservation.start_time) {
        // Tarih-saat parse işlemi
        let startDate = new Date(reservation.start_time);

        // JavaScript normalde UTC'ye dönüştürür, ama biz yerel saat dilimini korumak istiyoruz
        // startDate değerini yerel tarih olarak alın
        const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

        // ISO formatında end_time oluştur (Z olmadan)
        const localISOString = endDate.toISOString().split("Z")[0];
        reservation.end_time = localISOString;

        console.log("Oluşturulan başlangıç zamanı:", reservation.start_time);
        console.log("Oluşturulan bitiş zamanı:", reservation.end_time);
      }

      // Eğer tarih değeri açık bir şekilde belirtilmediyse ve start_time varsa, start_time'dan çıkart
      if (!reservation.date && reservation.start_time) {
        reservation.date = reservation.start_time.split("T")[0];
        console.log("Start_time'dan çıkartılan tarih:", reservation.date);
      }

      // Eğer saat değeri açık bir şekilde belirtilmediyse ve start_time varsa, start_time'dan çıkart
      if (!reservation.time && reservation.start_time) {
        const timePart = reservation.start_time.includes("T")
          ? reservation.start_time.split("T")[1]
          : reservation.start_time;

        reservation.time = timePart.substring(0, 5); // HH:MM formatı
        console.log("Start_time'dan çıkartılan saat:", reservation.time);
      }

      // Supabase rezervasyon işlemlerini kullan
      try {
        const result = await db.reservations.create({
          id: reservationId, // Önceden oluşturulan ID kullan
          table_id: reservation.table_id,
          customer_name: reservation.customer_name,
          customer_phone: reservation.phone,
          customer_email: reservation.email,
          guest_count: reservation.guest_count,
          start_time: reservation.start_time,
          end_time: reservation.end_time,
          status: reservation.status,
          note: reservation.notes,
          created_by: reservation.user_id,
          company_id: reservation.company_id,
          branch_id: reservation.branch_id,
          color: reservation.color,
        });

        console.log("Rezervasyon başarıyla oluşturuldu:", result);

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
      console.log("Rezervasyon güncelleniyor:", { id, updates });

      // Eğer start_time yoksa date ve time kullanarak oluştur
      if (!updates.start_time && updates.date && updates.time) {
        // Tarih ve saat bilgisini direkt string olarak birleştirerek ISO formatında oluştur
        // 'Z' karakteri eklenmediği için bu yerel saat olarak kabul edilecek
        updates.start_time = `${updates.date}T${updates.time}:00`;
        console.log("Güncellenen start_time:", updates.start_time);
      }

      // Eğer end_time verilmemişse ve start_time varsa start_time + 2 saat olarak ayarla
      if (!updates.end_time && updates.start_time) {
        // Start_time'ı parse et ve 2 saat ekle
        const startDate = new Date(updates.start_time);
        const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

        // ISO formatında end_time oluştur (Z olmadan)
        const localISOString = endDate.toISOString().split("Z")[0];
        updates.end_time = localISOString;

        console.log("Güncellenen bitiş zamanı:", updates.end_time);
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

      console.log("Supabase güncelleme verileri:", supabaseUpdates);

      const data = await db.reservations.update(id, supabaseUpdates);
      console.log("Güncellenen rezervasyon:", data);

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
