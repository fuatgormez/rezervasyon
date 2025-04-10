import kv from "../client";
import { z } from "zod";

// Masa şeması
export const TableSchema = z.object({
  id: z.string(),
  number: z.number().int().positive(),
  capacity: z.number().int().positive(),
  status: z.enum(["available", "reserved", "occupied", "maintenance"]),
  position: z
    .object({
      x: z.number().optional(),
      y: z.number().optional(),
    })
    .optional(),
  createdAt: z.date().or(z.string()).optional(),
  updatedAt: z.date().or(z.string()).optional(),
});

export type TableType = z.infer<typeof TableSchema>;

// Prefix'ler
const TABLE_PREFIX = "table:";
const TABLE_STATUS_PREFIX = "tablestatus:";

export const TableModel = {
  // Yeni masa oluştur
  async create(data: Omit<TableType, "id">): Promise<TableType> {
    const id = `table_${data.number}`;
    const now = new Date().toISOString();

    const table = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    // Şemayla doğrula
    TableSchema.parse(table);

    // KV store'a ekle
    await kv.set(`${TABLE_PREFIX}${id}`, table);

    // Status indeksine ekle
    await kv.sadd(`${TABLE_STATUS_PREFIX}${table.status}`, id);

    return table as TableType;
  },

  // ID'ye göre masa al
  async getById(id: string): Promise<TableType | null> {
    const table = await kv.get(`${TABLE_PREFIX}${id}`);
    return table as TableType | null;
  },

  // Masa numarasına göre masa al
  async getByNumber(number: number): Promise<TableType | null> {
    const id = `table_${number}`;
    return this.getById(id);
  },

  // Tüm masaları getir (filtreli)
  async getAll({ status }: { status?: string } = {}): Promise<TableType[]> {
    let tableIds: string[] = [];

    // Belirli durumda olan masaları getir
    if (status) {
      tableIds = await kv.smembers(`${TABLE_STATUS_PREFIX}${status}`);
    }
    // Tüm masaları getir
    else {
      // Dikkat: Büyük veriseti için uygun değil
      const keys = await kv.keys(`${TABLE_PREFIX}*`);
      tableIds = keys.map((key) => key.replace(TABLE_PREFIX, ""));
    }

    if (tableIds.length === 0) return [];

    // ID'lere göre tüm masaları al
    const tables = (await Promise.all(
      tableIds.map((id) => kv.get(`${TABLE_PREFIX}${id}`))
    )) as TableType[];

    // null değerlerini filtrele ve number'a göre sırala
    return tables.filter(Boolean).sort((a, b) => a.number - b.number);
  },

  // Masa güncelle
  async update(
    id: string,
    data: Partial<TableType>
  ): Promise<TableType | null> {
    const existing = (await kv.get(`${TABLE_PREFIX}${id}`)) as TableType | null;
    if (!existing) return null;

    const updated = {
      ...existing,
      ...data,
      id, // ID değiştirilemesin
      updatedAt: new Date().toISOString(),
    };

    // Şemayla doğrula
    TableSchema.parse(updated);

    // Eğer durum değişmişse, eski durum indeksinden sil
    if (data.status && data.status !== existing.status) {
      await kv.srem(`${TABLE_STATUS_PREFIX}${existing.status}`, id);
      await kv.sadd(`${TABLE_STATUS_PREFIX}${data.status}`, id);
    }

    // KV'ye kaydet
    await kv.set(`${TABLE_PREFIX}${id}`, updated);

    return updated;
  },

  // Masa sil
  async delete(id: string): Promise<boolean> {
    const table = (await kv.get(`${TABLE_PREFIX}${id}`)) as TableType | null;
    if (!table) return false;

    // İndekslerden kaldır
    await kv.srem(`${TABLE_STATUS_PREFIX}${table.status}`, id);

    // Ana kaydı sil
    await kv.del(`${TABLE_PREFIX}${id}`);

    return true;
  },

  // Varsayılan masaları oluştur (eğer mevcut değilse)
  async initializeDefaultTables(): Promise<void> {
    const existingTables = await this.getAll();

    // Eğer zaten masalar varsa, atla
    if (existingTables.length > 0) return;

    // Default masaları oluştur
    const defaultTables = [
      { number: 10, capacity: 2, status: "available" as const },
      { number: 11, capacity: 2, status: "available" as const },
      { number: 12, capacity: 4, status: "available" as const },
      { number: 13, capacity: 4, status: "available" as const },
      { number: 14, capacity: 4, status: "available" as const },
      { number: 15, capacity: 4, status: "available" as const },
      { number: 16, capacity: 2, status: "available" as const },
      { number: 17, capacity: 2, status: "available" as const },
      { number: 20, capacity: 2, status: "available" as const },
      { number: 21, capacity: 2, status: "available" as const },
      { number: 22, capacity: 4, status: "available" as const },
    ];

    // Hepsini oluştur
    await Promise.all(defaultTables.map((table) => this.create(table)));
  },
};

export default TableModel;
