import { createClient } from "@supabase/supabase-js";

// Supabase URL ve Anonim Anahtar
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "example-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tip tanımlamaları
export interface TableCategory {
  id: string;
  name: string;
  color: string;
  border_color: string;
  background_color: string;
  created_at: string;
  updated_at: string;
}

export interface Table {
  id: string;
  number: number;
  capacity: number;
  category_id: string;
  status: "available" | "unavailable" | "reserved";
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  table_id: string;
  customer_name: string;
  guest_count: number;
  start_time: string;
  end_time: string;
  status: "confirmed" | "pending" | "cancelled";
  note?: string;
  color?: string;
  staff_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: string;
  name: string;
  position: string;
  created_at: string;
  updated_at: string;
}

// Veritabanı işlemleri
export const db = {
  // Kategori işlemleri
  categories: {
    async getAll() {
      const { data, error } = await supabase
        .from("table_categories")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as TableCategory[];
    },

    async create(
      category: Omit<TableCategory, "id" | "created_at" | "updated_at">
    ) {
      const { data, error } = await supabase
        .from("table_categories")
        .insert([category])
        .select()
        .single();

      if (error) throw error;
      return data as TableCategory;
    },

    async update(id: string, category: Partial<TableCategory>) {
      const { data, error } = await supabase
        .from("table_categories")
        .update(category)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as TableCategory;
    },

    async delete(id: string) {
      const { error } = await supabase
        .from("table_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
  },

  // Masa işlemleri
  tables: {
    async getAll() {
      const { data, error } = await supabase
        .from("tables")
        .select("*")
        .order("number", { ascending: true });

      if (error) throw error;
      return data as Table[];
    },

    async create(table: Omit<Table, "id" | "created_at" | "updated_at">) {
      const { data, error } = await supabase
        .from("tables")
        .insert([table])
        .select()
        .single();

      if (error) throw error;
      return data as Table;
    },

    async update(id: string, table: Partial<Table>) {
      const { data, error } = await supabase
        .from("tables")
        .update(table)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Table;
    },

    async delete(id: string) {
      const { error } = await supabase.from("tables").delete().eq("id", id);

      if (error) throw error;
    },
  },

  // Rezervasyon işlemleri
  reservations: {
    async getAll() {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data as Reservation[];
    },

    async create(
      reservation: Omit<Reservation, "id" | "created_at" | "updated_at">
    ) {
      const { data, error } = await supabase
        .from("reservations")
        .insert([reservation])
        .select()
        .single();

      if (error) throw error;
      return data as Reservation;
    },

    async update(id: string, reservation: Partial<Reservation>) {
      const { data, error } = await supabase
        .from("reservations")
        .update(reservation)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Reservation;
    },

    async delete(id: string) {
      const { error } = await supabase
        .from("reservations")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },

    async getByDateRange(startDate: string, endDate: string) {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .gte("start_time", startDate)
        .lte("end_time", endDate)
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data as Reservation[];
    },

    async checkConflict(
      tableId: string,
      startTime: string,
      endTime: string,
      excludeId?: string
    ) {
      let query = supabase
        .from("reservations")
        .select("*")
        .eq("table_id", tableId)
        .overlaps("start_time", "end_time", startTime, endTime);

      if (excludeId) {
        query = query.neq("id", excludeId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as Reservation[]).length > 0;
    },
  },

  // Personel işlemleri
  staff: {
    async getAll() {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Staff[];
    },

    async create(staff: Omit<Staff, "id" | "created_at" | "updated_at">) {
      const { data, error } = await supabase
        .from("staff")
        .insert([staff])
        .select()
        .single();

      if (error) throw error;
      return data as Staff;
    },

    async update(id: string, staff: Partial<Staff>) {
      const { data, error } = await supabase
        .from("staff")
        .update(staff)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Staff;
    },

    async delete(id: string) {
      const { error } = await supabase.from("staff").delete().eq("id", id);

      if (error) throw error;
    },
  },
};
