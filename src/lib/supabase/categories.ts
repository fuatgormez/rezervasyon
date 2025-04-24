import { supabase } from "./client";

export interface Category {
  id: number;
  name: string;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface CategoryInput {
  name: string;
  status: "active" | "inactive";
}

export const categories = {
  getAll: async (): Promise<Category[]> => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return data;
  },

  create: async (category: CategoryInput): Promise<Category> => {
    const { data, error } = await supabase
      .from("categories")
      .insert([category])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  update: async (
    id: number,
    category: Partial<CategoryInput>
  ): Promise<Category> => {
    const { data, error } = await supabase
      .from("categories")
      .update(category)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  delete: async (id: number): Promise<void> => {
    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error) throw error;
  },

  getById: async (id: number): Promise<Category> => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  getByStatus: async (status: "active" | "inactive"): Promise<Category[]> => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("status", status)
      .order("name", { ascending: true });

    if (error) throw error;
    return data;
  },
};
