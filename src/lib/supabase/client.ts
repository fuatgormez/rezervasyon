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
  id: number;
  number: number;
  capacity: number;
  category_id: string;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  table_id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  guest_count: number;
  start_time: string;
  end_time: string;
  status: "confirmed" | "pending" | "cancelled" | "completed";
  note?: string;
  payment_status?: "unpaid" | "partial" | "paid";
  color?: string;
  created_by?: string;
  company_id?: string;
  branch_id?: string;
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

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  formitable_id?: string;
  company_id?: string;
  branch_id?: string;
  created_at: string;
  updated_at?: string;
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

    async getById(id: string) {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Reservation;
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

    async getByTableId(tableId: string) {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("table_id", tableId)
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data as Reservation[];
    },

    async getTodayReservations() {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      return this.getByDateRange(startOfDay, endOfDay);
    },

    async checkConflict(
      tableId: string,
      startTime: string,
      endTime: string,
      excludeId?: string
    ) {
      console.log("Çakışma kontrolü:", {
        tableId,
        startTime,
        endTime,
        excludeId,
      });

      // Tarih/saat formatını standarlaştır
      // ISO formatına çevrildiğinden emin ol, Z (UTC) olmadan
      const standardizedStartTime = new Date(startTime)
        .toISOString()
        .split("Z")[0];
      const standardizedEndTime = new Date(endTime).toISOString().split("Z")[0];

      console.log("Standardize edilmiş zamanlar:", {
        standardizedStartTime,
        standardizedEndTime,
      });

      let query = supabase
        .from("reservations")
        .select("*")
        .eq("table_id", tableId)
        .filter("start_time", "lt", standardizedEndTime)
        .filter("end_time", "gt", standardizedStartTime);

      if (excludeId) {
        query = query.neq("id", excludeId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Çakışma kontrol hatası:", error);
        throw error;
      }

      // Bulunan çakışmaları logla
      if (data && data.length > 0) {
        console.log(`${data.length} çakışma bulundu:`, data);
      } else {
        console.log("Çakışma bulunamadı");
      }

      return (data as Reservation[]).length > 0;
    },

    async updateStatus(id: string, status: Reservation["status"]) {
      return this.update(id, { status });
    },

    async updatePaymentStatus(
      id: string,
      paymentStatus: Reservation["payment_status"]
    ) {
      return this.update(id, { payment_status: paymentStatus });
    },
  },

  // Müşteri işlemleri
  customers: {
    async getAll() {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Customer[];
    },

    async getById(id: string) {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Customer;
    },

    async create(customer: Omit<Customer, "id" | "created_at" | "updated_at">) {
      const { data, error } = await supabase
        .from("customers")
        .insert([customer])
        .select()
        .single();

      if (error) throw error;
      return data as Customer;
    },

    async update(id: string, customer: Partial<Customer>) {
      const { data, error } = await supabase
        .from("customers")
        .update(customer)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Customer;
    },

    async delete(id: string) {
      const { error } = await supabase.from("customers").delete().eq("id", id);

      if (error) throw error;
    },

    async search(query: string) {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .or(
          `name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`
        )
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Customer[];
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
