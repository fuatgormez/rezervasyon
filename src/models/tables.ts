// Masa yapısı için arayüz tanımlaması
export interface Table {
  id: string;
  number: number;
  capacity: number;
  category_id: string;
  status: "active" | "inactive" | "reserved";
  created_at?: string;
  updated_at?: string;
}

// Masa kategorisi için arayüz tanımlaması
export interface TableCategory {
  id: string;
  name: string;
  color: string; // Rezervasyon rengi (RGBA)
  border_color: string; // Kenarlık rengi (HEX)
  background_color: string; // Arkaplan rengi (HEX)
  created_at?: string;
  updated_at?: string;
}

// Dummy masalar (test için)
export const mockTables: Table[] = [
  {
    id: "t1",
    number: 1,
    capacity: 4,
    category_id: "1",
    status: "active",
  },
  {
    id: "t2",
    number: 2,
    capacity: 2,
    category_id: "1",
    status: "active",
  },
  {
    id: "t3",
    number: 3,
    capacity: 6,
    category_id: "2",
    status: "active",
  },
  {
    id: "t4",
    number: 4,
    capacity: 8,
    category_id: "3",
    status: "active",
  },
];

// Dummy kategoriler (test için)
export const mockTableCategories: TableCategory[] = [
  {
    id: "1",
    name: "Teras",
    color: "rgba(52, 152, 219, 0.8)",
    border_color: "#2980b9",
    background_color: "#f0f9ff", // Açık mavi arkaplan
  },
  {
    id: "2",
    name: "Bahçe",
    color: "rgba(46, 204, 113, 0.8)",
    border_color: "#27ae60",
    background_color: "#f0fdf4", // Açık yeşil arkaplan
  },
  {
    id: "3",
    name: "İç Mekan",
    color: "rgba(231, 76, 60, 0.8)",
    border_color: "#c0392b",
    background_color: "#fef2f2", // Açık kırmızı arkaplan
  },
];
