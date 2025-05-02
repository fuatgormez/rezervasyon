export interface User {
  id: string;
  email: string;
  name?: string;
  role: "admin" | "user";
  created_at: string;
}

export interface Reservation {
  id: string;
  user_id: string;
  company_id: string;
  branch_id?: string;
  table_id: string;
  date: string;
  time: string;
  start_time?: string;
  end_time?: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  payment_status?: "unpaid" | "partial" | "paid";
  created_at: string;
  updated_at?: string;
  customer_name: string;
  guest_count: number;
  phone?: string;
  email?: string;
  notes?: string;
  color?: string;
}

export interface Company {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  working_hours?: WorkingHours;
  created_at: string;
}

export interface WorkingHours {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
}

export interface DaySchedule {
  open: string;
  close: string;
  breaks?: Break[];
}

export interface Break {
  start: string;
  end: string;
}
