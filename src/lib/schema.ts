// Schema dosyası - SQL şemasını TypeScript içinden kullanılabilir hale getirir

export const schema = {
  // Masa kategorileri tablosu
  createTableCategories: `
    CREATE TABLE IF NOT EXISTS table_categories (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      color VARCHAR(50) NOT NULL,
      border_color VARCHAR(50) NOT NULL,
      background_color VARCHAR(50) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `,

  // Masalar tablosu
  createTables: `
    CREATE TABLE IF NOT EXISTS tables (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      number INTEGER NOT NULL,
      capacity INTEGER NOT NULL,
      category_id UUID REFERENCES table_categories(id) ON DELETE CASCADE,
      status VARCHAR(20) CHECK (status IN ('available', 'unavailable', 'reserved')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `,

  // Personel tablosu
  createStaff: `
    CREATE TABLE IF NOT EXISTS staff (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      position VARCHAR(100) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `,

  // Rezervasyonlar tablosu
  createReservations: `
    CREATE TABLE IF NOT EXISTS reservations (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      user_id UUID NOT NULL,
      company_id UUID NOT NULL,
      date VARCHAR(10) NOT NULL,
      time VARCHAR(8) NOT NULL,
      table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
      customer_name VARCHAR(255) NOT NULL,
      guest_count INTEGER NOT NULL,
      status VARCHAR(20) CHECK (status IN ('confirmed', 'pending', 'cancelled')),
      phone VARCHAR(20),
      email VARCHAR(255),
      notes TEXT,
      end_time VARCHAR(8),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `,

  // Otomatik güncelleme için trigger fonksiyonu
  createUpdatedAtFunction: `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `,

  // Her tablo için updated_at trigger'ları
  createTriggers: `
    DROP TRIGGER IF EXISTS update_table_categories_updated_at ON table_categories;
    CREATE TRIGGER update_table_categories_updated_at
      BEFORE UPDATE ON table_categories
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_tables_updated_at ON tables;
    CREATE TRIGGER update_tables_updated_at
      BEFORE UPDATE ON tables
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_staff_updated_at ON staff;
    CREATE TRIGGER update_staff_updated_at
      BEFORE UPDATE ON staff
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_reservations_updated_at ON reservations;
    CREATE TRIGGER update_reservations_updated_at
      BEFORE UPDATE ON reservations
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `,

  // Rezervasyon çakışmalarını kontrol eden fonksiyon
  createReservationConflictFunction: `
    CREATE OR REPLACE FUNCTION check_reservation_conflict(
      p_table_id UUID,
      p_start_time TIMESTAMP WITH TIME ZONE,
      p_end_time TIMESTAMP WITH TIME ZONE,
      p_exclude_id UUID DEFAULT NULL
    )
    RETURNS BOOLEAN AS $$
    DECLARE
      conflict_exists BOOLEAN;
    BEGIN
      SELECT EXISTS (
        SELECT 1
        FROM reservations
        WHERE table_id = p_table_id
        AND status != 'cancelled'
        AND (id != p_exclude_id OR p_exclude_id IS NULL)
        AND (
          (start_time, end_time) OVERLAPS (p_start_time, p_end_time)
        )
      ) INTO conflict_exists;
      
      RETURN conflict_exists;
    END;
    $$ LANGUAGE plpgsql;
  `,
};

export default schema;
