export type UserRole =
  | "USER"
  | "ADMIN"
  | "SUPER_ADMIN"
  | "COMPANY_ADMIN"
  | "RESTAURANT_ADMIN";

// Firma tanımı
export interface Company {
  id: string;
  name: string;
  slug: string; // URL için (örn: tamer-restoran-grubu)
  logo?: string;
  phone?: string;
  email?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

// Restoran tanımı
export interface Restaurant {
  id: string;
  companyId: string;
  name: string;
  slug?: string; // URL için (örn: tamer-merkez-sube)
  address: string;
  phone: string;
  email?: string;
  logo?: string;
  capacity?: number;
  openingTime?: string; // "07:00" formatında
  closingTime?: string; // "02:00" formatında
  settings?: {
    timezone: string;
    currency: string;
    openingHours: {
      [key: string]: {
        // "monday", "tuesday", etc.
        open: string;
        close: string;
        isClosed: boolean;
      };
    };
    tableCapacity: number;
    reservationSettings: {
      maxAdvanceDays: number;
      minAdvanceHours: number;
      slotDuration: number; // dakika
      allowOnlineBooking: boolean;
    };
  };
  createdAt?: Date;
  updatedAt?: Date;
  isActive: boolean;
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  companyId?: string; // Hangi firmaya bağlı (SUPER_ADMIN için null)
  restaurantIds?: string[]; // Hangi restoranlara erişimi var
  permissions?: {
    canManageReservations: boolean;
    canManageTables: boolean;
    canManageStaff: boolean;
    canManageSettings: boolean;
    canViewReports: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
  isActive: boolean;
}

export interface UserLog {
  id: string;
  userId: string;
  companyId?: string;
  restaurantId?: string;
  action: string;
  details: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

// Context için
export interface UserContext {
  user: User | null;
  company: Company | null;
  restaurants: Restaurant[];
  selectedRestaurant: Restaurant | null;
  setSelectedRestaurant: (restaurant: Restaurant) => void;
  loading: boolean;
}

// Müşteri tanımı
export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  // Formitable özel alanları
  city?: string;
  address?: string;
  birthday?: string;
  company?: string;
  // Rezervasyon bilgileri
  lastVisit?: string;
  visitCount?: number;
  totalSpent?: number;
  // Sistem alanları
  restaurantId: string;
  companyId?: string;
  createdAt: string;
  updatedAt: string;
  reservationCount: number;
  loyaltyPoints: number;
  isActive?: boolean;
  // Rating ve değerlendirme
  rating?: {
    stars: number;
    reservationCount: number;
    isBlacklisted: boolean;
    badges: string[];
  };
}
