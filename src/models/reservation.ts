import { supabase } from "@/lib/supabase/client";

export class ReservationModel {
  static async update(id: string, data: Partial<any>) {
    const { error } = await supabase
      .from("reservations")
      .update(data)
      .eq("id", id);

    if (error) {
      throw error;
    }

    return true;
  }

  static async getById(id: string) {
    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw error;
    }

    return data;
  }
}
