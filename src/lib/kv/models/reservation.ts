import kv from "../client";
import { z } from "zod";

// Rezervasyon şeması (Zod ile doğrulama için)
export const ReservationSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  customerName: z.string(),
  tableId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  guests: z.number().int().positive(),
  status: z.enum(["confirmed", "pending", "cancelled", "completed"]),
  type: z.enum(["RESERVATION", "WALK_IN", "SPECIAL"]),
  phone: z.string().optional(),
  isNewGuest: z.boolean().optional(),
  language: z.string().optional(),
  color: z.string().optional(),
  createdAt: z.date().or(z.string()).optional(),
  updatedAt: z.date().or(z.string()).optional(),
});

export type ReservationType = z.infer<typeof ReservationSchema>;

// Prefix'ler - KV store'da anahtarları ayırmak için
const RESERVATION_PREFIX = "reservation:";
const TABLE_RESERVATION_PREFIX = "table:reservation:";
const DATE_RESERVATION_PREFIX = "date:reservation:";

export const ReservationModel = {
  // Yeni rezervasyon oluştur
  async create(data: Omit<ReservationType, "id">): Promise<ReservationType> {
    const id = `res_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 7)}`;
    const now = new Date().toISOString();

    const reservation = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    // Şemayla doğrula
    ReservationSchema.parse(reservation);

    // KV store'a ekle
    await kv.set(`${RESERVATION_PREFIX}${id}`, reservation);

    // Tablo için index ekle
    await kv.sadd(`${TABLE_RESERVATION_PREFIX}${reservation.tableId}`, id);

    // Tarih için index ekle (YYYY-MM-DD formatında)
    const dateStr =
      reservation.startTime.split("T")[0] ||
      new Date().toISOString().split("T")[0];
    await kv.sadd(`${DATE_RESERVATION_PREFIX}${dateStr}`, id);

    return reservation as ReservationType;
  },

  // ID'ye göre rezervasyon al
  async getById(id: string): Promise<ReservationType | null> {
    const reservation = await kv.get(`${RESERVATION_PREFIX}${id}`);
    return reservation as ReservationType | null;
  },

  // Tüm rezervasyonları getir (filtreli)
  async getAll({
    status,
    type,
    tableId,
    date,
  }: {
    status?: string;
    type?: string;
    tableId?: string;
    date?: string;
  } = {}): Promise<ReservationType[]> {
    let reservationIds: string[] = [];

    // Belirli bir masanın rezervasyonlarını getir
    if (tableId) {
      reservationIds = await kv.smembers(
        `${TABLE_RESERVATION_PREFIX}${tableId}`
      );
    }
    // Belirli bir tarihin rezervasyonlarını getir
    else if (date) {
      reservationIds = await kv.smembers(`${DATE_RESERVATION_PREFIX}${date}`);
    }
    // Tüm rezervasyonları getir (çok fazla ise sayfalama eklenebilir)
    else {
      // Bu çok verimli değil, pratik projede scan kullan veya tarih bazlı filtrele
      const keys = await kv.keys(`${RESERVATION_PREFIX}*`);
      reservationIds = keys.map((key) => key.replace(RESERVATION_PREFIX, ""));
    }

    if (reservationIds.length === 0) return [];

    // ID'lere göre tüm rezervasyonları al
    const reservations: ReservationType[] = await Promise.all(
      reservationIds.map((id) => kv.get(`${RESERVATION_PREFIX}${id}`))
    );

    // Filtreleme işlemi
    return reservations.filter((reservation) => {
      if (!reservation) return false;
      if (status && reservation.status !== status) return false;
      if (type && reservation.type !== type) return false;
      return true;
    }) as ReservationType[];
  },

  // Rezervasyon güncelle
  async update(
    id: string,
    data: Partial<ReservationType>
  ): Promise<ReservationType | null> {
    const existing = await kv.get(`${RESERVATION_PREFIX}${id}`);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...data,
      id, // ID değiştirilemesin
      updatedAt: new Date().toISOString(),
    };

    // Şemayla doğrula
    ReservationSchema.parse(updated);

    // Eğer masa değişmişse, eski masa indeksinden sil
    if (data.tableId && data.tableId !== existing.tableId) {
      await kv.srem(`${TABLE_RESERVATION_PREFIX}${existing.tableId}`, id);
      await kv.sadd(`${TABLE_RESERVATION_PREFIX}${data.tableId}`, id);
    }

    // KV'ye kaydet
    await kv.set(`${RESERVATION_PREFIX}${id}`, updated);

    return updated as ReservationType;
  },

  // Rezervasyon sil
  async delete(id: string): Promise<boolean> {
    const reservation = await kv.get(`${RESERVATION_PREFIX}${id}`);
    if (!reservation) return false;

    // İndekslerden kaldır
    await kv.srem(`${TABLE_RESERVATION_PREFIX}${reservation.tableId}`, id);

    const dateStr =
      reservation.startTime.split("T")[0] ||
      new Date().toISOString().split("T")[0];
    await kv.srem(`${DATE_RESERVATION_PREFIX}${dateStr}`, id);

    // Ana kaydı sil
    await kv.del(`${RESERVATION_PREFIX}${id}`);

    return true;
  },

  // Masa müsait mi kontrolü
  async isTableAvailable(
    tableId: string,
    startTime: string,
    endTime: string,
    excludeReservationId?: string
  ): Promise<boolean> {
    // Masanın tüm rezervasyonlarını al
    const reservationIds = await kv.smembers(
      `${TABLE_RESERVATION_PREFIX}${tableId}`
    );
    if (reservationIds.length === 0) return true;

    const reservations = (await Promise.all(
      reservationIds.map((id) => kv.get(`${RESERVATION_PREFIX}${id}`))
    )) as ReservationType[];

    // Çakışan rezervasyonları kontrol et
    return !reservations.some((reservation) => {
      if (!reservation) return false;

      // Hariç tutulacak rezervasyonu atla
      if (excludeReservationId && reservation.id === excludeReservationId)
        return false;

      // İptal edilmiş rezervasyonları atla
      if (reservation.status === "cancelled") return false;

      // Zaman çakışması var mı?
      const resStart = new Date(
        `2000-01-01T${reservation.startTime}`
      ).getTime();
      const resEnd = new Date(`2000-01-01T${reservation.endTime}`).getTime();
      const newStart = new Date(`2000-01-01T${startTime}`).getTime();
      const newEnd = new Date(`2000-01-01T${endTime}`).getTime();

      // Zaman aralıkları çakışıyor mu?
      return (
        (newStart >= resStart && newStart < resEnd) || // Yeni başlangıç mevcut aralıkta
        (newEnd > resStart && newEnd <= resEnd) || // Yeni bitiş mevcut aralıkta
        (newStart <= resStart && newEnd >= resEnd) // Yeni aralık mevcut aralığı kapsıyor
      );
    });
  },
};

export default ReservationModel;
