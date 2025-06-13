export interface Reservation {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  status: "pending" | "confirmed" | "cancelled";
  created_at: string;
  updated_at: string;
}
