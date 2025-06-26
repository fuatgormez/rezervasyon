export interface Reservation {
  id: string;
  companyId: string;
  restaurantId: string;
  tableId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  guestCount: number;
  startTime: string;
  endTime: string;
  date: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  note?: string;
  specialRequests?: string;
  staffIds?: string[]; // Atanan garsonlar
  createdBy: string; // User ID
  createdAt: Date;
  updatedAt: Date;
}

export interface Table {
  id: string;
  companyId: string;
  restaurantId: string;
  number: number;
  capacity: number;
  categoryId: string;
  status: "available" | "occupied" | "reserved" | "maintenance";
  position?: {
    x: number;
    y: number;
  };
  shape?: "square" | "round" | "rectangle";
  isActive: boolean;
}

export interface TableCategory {
  id: string;
  companyId: string;
  restaurantId: string;
  name: string;
  color: string;
  borderColor: string;
  backgroundColor: string;
  description?: string;
  isActive: boolean;
}
