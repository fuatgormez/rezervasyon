import { supabase } from "./client";

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
