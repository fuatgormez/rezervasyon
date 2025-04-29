import { supabase } from "./client";
import {
  TableCategory,
  Table as TableType,
  Reservation,
  Staff,
} from "./client";

export interface Table {
  id: number;
  number: number;
  capacity: number;
  status: "active" | "inactive";
  is_online_reservable: boolean;
  category_id: number;
  created_at: string;
  updated_at: string;
}

export interface TableInput {
  number: number;
  capacity: number;
  status: "active" | "inactive";
  is_online_reservable: boolean;
  category_id: number;
}

export const tables = {
  getAll: async (): Promise<Table[]> => {
    const { data, error } = await supabase
      .from("tables")
      .select("*")
      .order("number", { ascending: true });

    if (error) throw error;
    return data;
  },

  create: async (table: TableInput): Promise<Table> => {
    const { data, error } = await supabase
      .from("tables")
      .insert([table])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  update: async (id: number, table: Partial<TableInput>): Promise<Table> => {
    const { data, error } = await supabase
      .from("tables")
      .update(table)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  delete: async (id: number): Promise<void> => {
    const { error } = await supabase.from("tables").delete().eq("id", id);

    if (error) throw error;
  },

  getById: async (id: number): Promise<Table> => {
    const { data, error } = await supabase
      .from("tables")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  getByCategoryId: async (categoryId: number): Promise<Table[]> => {
    const { data, error } = await supabase
      .from("tables")
      .select("*")
      .eq("category_id", categoryId)
      .order("number", { ascending: true });

    if (error) throw error;
    return data;
  },

  getByStatus: async (status: "active" | "inactive"): Promise<Table[]> => {
    const { data, error } = await supabase
      .from("tables")
      .select("*")
      .eq("status", status)
      .order("number", { ascending: true });

    if (error) throw error;
    return data;
  },
};

// Örnek masa kategorileri
export const mockTableCategories: TableCategory[] = [
  {
    id: "1",
    name: "TERAS",
    color: "rgba(74, 108, 155, 0.8)",
    border_color: "#5880B3",
    background_color: "#f0f9ff",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    name: "BAHÇE",
    color: "rgba(85, 138, 112, 0.8)",
    border_color: "#509F6D",
    background_color: "#f0fdf4",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "3",
    name: "İÇ SALON",
    color: "rgba(166, 97, 97, 0.8)",
    border_color: "#A06363",
    background_color: "#fef2f2",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Örnek masalar
export const mockTables: TableType[] = [
  {
    id: "t1",
    number: 1,
    capacity: 4,
    category_id: "1",
    status: "available",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "t2",
    number: 2,
    capacity: 2,
    category_id: "1",
    status: "available",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "t3",
    number: 3,
    capacity: 6,
    category_id: "2",
    status: "available",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "t4",
    number: 4,
    capacity: 4,
    category_id: "3",
    status: "available",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Örnek rezervasyonlar
export const mockReservations: Reservation[] = [
  {
    id: "r1",
    table_id: "t1",
    customer_name: "Ahmet Yılmaz",
    guest_count: 3,
    start_time: new Date(new Date().setHours(19, 0, 0, 0)).toISOString(),
    end_time: new Date(new Date().setHours(21, 0, 0, 0)).toISOString(),
    status: "confirmed",
    note: "Pencere kenarı tercih edildi",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "r2",
    table_id: "t3",
    customer_name: "Ayşe Demir",
    guest_count: 5,
    start_time: new Date(new Date().setHours(20, 0, 0, 0)).toISOString(),
    end_time: new Date(new Date().setHours(22, 30, 0, 0)).toISOString(),
    status: "confirmed",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Örnek personel
export const mockStaff: Staff[] = [
  {
    id: "s1",
    name: "Mehmet Kaya",
    position: "Garson",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "s2",
    name: "Zeynep Çelik",
    position: "Kıdemli Garson",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "s3",
    name: "Ali Yıldız",
    position: "Şef Garson",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];
