import { kv } from "@vercel/kv";

export { kv };

// Rezervasyon tipi için bir interface oluşturalım
export interface Reservation {
  id: string;
  tableId: string;
  startTime: string | Date;
  duration: number;
  customer?: {
    name: string;
    email?: string;
    phone?: string;
  };
  status?: string;
  type?: string;
  guests?: number;
  payment?: {
    amount: number;
    method?: string;
    status?: string;
  };
  [key: string]: unknown; // Diğer olası alanlar için unknown tipini kullanıyoruz
}

// Tablo işlemlerini re-export et
export * from "./tables";

export const getAllReservations = async (): Promise<Reservation[]> => {
  try {
    const reservations = await kv.hgetall<Record<string, Reservation>>(
      "reservations"
    );
    return Object.values(reservations || {});
  } catch (error) {
    console.error("Error getting all reservations:", error);
    return [];
  }
};

export const getReservationById = async (
  id: string
): Promise<Reservation | null> => {
  try {
    return await kv.hget<Reservation>("reservations", id);
  } catch (error) {
    console.error(`Error getting reservation ${id}:`, error);
    return null;
  }
};

export const createReservation = async (
  reservation: Partial<Reservation>
): Promise<Reservation> => {
  const id = reservation.id || `res_${Date.now()}`;
  const newReservation = { ...reservation, id } as Reservation;

  try {
    await kv.hset("reservations", { [id]: newReservation });

    // İlgili tarih için tablo rezervasyonlarını güncelle
    if (newReservation.tableId && newReservation.startTime) {
      const date = new Date(newReservation.startTime)
        .toISOString()
        .split("T")[0];
      const tableKey = `table_${newReservation.tableId}_${date}`;
      await kv.sadd(tableKey, id);
    }

    return newReservation;
  } catch (error) {
    console.error("Error creating reservation:", error);
    throw error;
  }
};

export const updateReservation = async (
  id: string,
  updates: Partial<Reservation>
): Promise<Reservation> => {
  try {
    const reservation = await getReservationById(id);
    if (!reservation) {
      throw new Error(`Reservation ${id} not found`);
    }

    const updatedReservation = { ...reservation, ...updates };
    await kv.hset("reservations", { [id]: updatedReservation });

    return updatedReservation;
  } catch (error) {
    console.error(`Error updating reservation ${id}:`, error);
    throw error;
  }
};

export const deleteReservation = async (id: string): Promise<boolean> => {
  try {
    const reservation = await getReservationById(id);
    if (!reservation) {
      throw new Error(`Reservation ${id} not found`);
    }

    // Rezervasyonu sil
    await kv.hdel("reservations", id);

    // İlgili tarih için tablo rezervasyonlarından da kaldır
    if (reservation.tableId && reservation.startTime) {
      const date = new Date(reservation.startTime).toISOString().split("T")[0];
      const tableKey = `table_${reservation.tableId}_${date}`;
      await kv.srem(tableKey, id);
    }

    return true;
  } catch (error) {
    console.error(`Error deleting reservation ${id}:`, error);
    throw error;
  }
};

export const isTableAvailable = async (
  tableId: string,
  startTime: Date,
  duration: number,
  excludeReservationId?: string
): Promise<boolean> => {
  try {
    const date = startTime.toISOString().split("T")[0];
    const tableKey = `table_${tableId}_${date}`;

    // Bu tablo için tüm rezervasyon ID'lerini al
    const reservationIds = await kv.smembers(tableKey);

    if (!reservationIds || reservationIds.length === 0) {
      return true; // Bu tablo için hiç rezervasyon yok
    }

    // Tüm rezervasyonları al
    const reservationsObj = await kv.hgetall<Record<string, Reservation>>(
      "reservations"
    );
    if (!reservationsObj) return true;

    const reservations = Object.values(reservationsObj).filter(
      (r: Reservation) =>
        reservationIds.includes(r.id) && r.id !== excludeReservationId
    );

    // Çakışma kontrolü
    const requestEndTime = new Date(startTime.getTime() + duration * 60 * 1000);

    for (const res of reservations) {
      const resStartTime = new Date(res.startTime);
      const resEndTime = new Date(
        resStartTime.getTime() + res.duration * 60 * 1000
      );

      // Zaman çakışması kontrolü
      if (
        (startTime >= resStartTime && startTime < resEndTime) ||
        (requestEndTime > resStartTime && requestEndTime <= resEndTime) ||
        (startTime <= resStartTime && requestEndTime >= resEndTime)
      ) {
        return false; // Çakışma var
      }
    }

    return true; // Çakışma yok
  } catch (error) {
    console.error(`Error checking table availability for ${tableId}:`, error);
    return false; // Hata durumunda güvenli bir yaklaşım olarak false döndür
  }
};
