// src/types/admin.ts
// Admin paneli için tipler burada tutulur.

export interface Reservation {
  id: string;
  tableId: string;
  customerName: string;
  guestCount: number;
  startTime: string;
  endTime: string;
  status: "confirmed" | "pending" | "cancelled";
  note?: string;
  date: string;
}

export interface Table {
  id: string;
  number: number;
  capacity: number;
  categoryId: string;
  status: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  borderColor: string;
  backgroundColor: string;
}
