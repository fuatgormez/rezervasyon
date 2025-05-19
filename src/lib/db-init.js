import { supabase } from "./supabase/client";
import { v4 as uuidv4 } from "uuid";

// Veritabanı tablolarını ve ilk verileri oluşturmak için fonksiyon
async function initializeDatabase() {
  try {
    console.log("Veritabanı başlatılıyor...");

    // 1. Masa kategorileri kontrol et, yoksa varsayılan verileri ekle
    console.log("Masa kategorileri kontrol ediliyor...");
    const { data: existingCategories, error: categoriesError } = await supabase
      .from("table_categories")
      .select("*");

    if (categoriesError) {
      console.error("Kategorileri alırken hata:", categoriesError);
    }

    // Kategoriler ID'lerini depolamak için nesne
    const categoryIds = {};

    if (!existingCategories || existingCategories.length === 0) {
      console.log(
        "Kategoriler bulunamadı, varsayılan kategoriler ekleniyor..."
      );
      // Varsayılan masa kategorilerini ekle
      const defaultCategories = [
        {
          id: uuidv4(),
          name: "Teras",
          color: "#FF5722",
          border_color: "#E64A19",
          background_color: "#FFCCBC",
        },
        {
          id: uuidv4(),
          name: "Bahçe",
          color: "#4CAF50",
          border_color: "#388E3C",
          background_color: "#C8E6C9",
        },
        {
          id: uuidv4(),
          name: "İç Salon",
          color: "#2196F3",
          border_color: "#1976D2",
          background_color: "#BBDEFB",
        },
      ];

      // Kategorileri ekleyin ve ID'lerini kaydedin
      for (const category of defaultCategories) {
        const { data, error: insertCategoryError } = await supabase
          .from("table_categories")
          .insert(category)
          .select()
          .single();

        if (insertCategoryError) {
          console.error(
            `Kategori ekleme hatası (${category.name}):`,
            insertCategoryError
          );
        } else {
          console.log(`Kategori eklendi: ${category.name} (ID: ${data.id})`);
          categoryIds[category.name] = data.id;
        }
      }
    } else {
      console.log(`${existingCategories.length} kategori bulundu`);

      // Mevcut kategorileri kaydet
      for (const category of existingCategories) {
        categoryIds[category.name] = category.id;
      }
    }

    // 2. Masalar tablosunu kontrol et, yoksa varsayılan verileri ekle
    console.log("Masalar kontrol ediliyor...");
    const { data: existingTables, error: tablesError } = await supabase
      .from("tables")
      .select("*");

    if (tablesError) {
      console.error("Masaları alırken hata:", tablesError);
    }

    if (!existingTables || existingTables.length === 0) {
      console.log("Masalar bulunamadı, varsayılan masalar ekleniyor...");

      // Varsayılan masaları ekle - kategoriler oluşturulduktan sonra
      if (Object.keys(categoryIds).length > 0) {
        const defaultTables = [
          // TERAS kategorisindeki masalar
          {
            id: uuidv4(),
            number: 1,
            capacity: 2,
            category_id: categoryIds["Teras"],
            status: "active",
          },
          {
            id: uuidv4(),
            number: 2,
            capacity: 4,
            category_id: categoryIds["Teras"],
            status: "active",
          },
          {
            id: uuidv4(),
            number: 3,
            capacity: 6,
            category_id: categoryIds["Teras"],
            status: "active",
          },
          {
            id: uuidv4(),
            number: 4,
            capacity: 8,
            category_id: categoryIds["Teras"],
            status: "active",
          },
          {
            id: uuidv4(),
            number: 5,
            capacity: 2,
            category_id: categoryIds["Teras"],
            status: "active",
          },

          // BAHÇE kategorisindeki masalar
          {
            id: uuidv4(),
            number: 6,
            capacity: 2,
            category_id: categoryIds["Bahçe"],
            status: "active",
          },
          {
            id: uuidv4(),
            number: 7,
            capacity: 4,
            category_id: categoryIds["Bahçe"],
            status: "active",
          },
          {
            id: uuidv4(),
            number: 8,
            capacity: 6,
            category_id: categoryIds["Bahçe"],
            status: "active",
          },
          {
            id: uuidv4(),
            number: 9,
            capacity: 8,
            category_id: categoryIds["Bahçe"],
            status: "active",
          },

          // İÇ SALON kategorisindeki masalar
          {
            id: uuidv4(),
            number: 10,
            capacity: 2,
            category_id: categoryIds["İç Salon"],
            status: "active",
          },
          {
            id: uuidv4(),
            number: 11,
            capacity: 4,
            category_id: categoryIds["İç Salon"],
            status: "active",
          },
          {
            id: uuidv4(),
            number: 12,
            capacity: 6,
            category_id: categoryIds["İç Salon"],
            status: "active",
          },
          {
            id: uuidv4(),
            number: 13,
            capacity: 8,
            category_id: categoryIds["İç Salon"],
            status: "active",
          },
        ];

        for (const table of defaultTables) {
          const { data, error: insertTableError } = await supabase
            .from("tables")
            .insert(table)
            .select()
            .single();

          if (insertTableError) {
            console.error(
              `Masa ekleme hatası (${table.id}):`,
              insertTableError
            );
          } else {
            console.log(`Masa eklendi: Masa ${table.number} (${data.id})`);
          }
        }
      } else {
        console.error("Kategoriler oluşturulamadığı için masalar eklenemedi");
      }
    } else {
      console.log(`${existingTables.length} masa bulundu`);
    }

    // Masaları yeniden al ve sayısını kontrol et
    const { data: finalTables, error: finalTablesError } = await supabase
      .from("tables")
      .select("*");

    if (finalTablesError) {
      console.error("Son masa kontrol hatası:", finalTablesError);
    } else {
      console.log(`Toplamda ${finalTables?.length || 0} masa bulunuyor`);
    }

    console.log(
      "Veritabanı başarıyla kontrol edildi ve eksik veriler eklendi!"
    );
    return { success: true, tables: finalTables || [] };
  } catch (error) {
    console.error("Veritabanı başlatma hatası:", error);
    return { success: false, error };
  }
}

// Modül olarak dışa aktar
export default initializeDatabase;
