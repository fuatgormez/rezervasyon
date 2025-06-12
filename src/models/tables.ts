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
