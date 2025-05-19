"use client";

import { useEffect, useState } from "react";
import initializeDatabase from "../../lib/db-init";
import { supabase } from "../../lib/supabase/client";
import { v4 as uuidv4 } from "uuid";

export default function InitDBPage() {
  const [status, setStatus] = useState<string>("Hazır");
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [restaurantKey, setRestaurantKey] = useState<string>("");
  const [formitableRestaurantId, setFormitableRestaurantId] =
    useState<string>("");
  const [importStatus, setImportStatus] = useState<string>("");
  const [importedData, setImportedData] = useState<{
    customers?: number;
    tables?: number;
  }>({});

  // Manuel eklemeler için state
  const [showManualForm, setShowManualForm] = useState<boolean>(false);
  const [manualTableData, setManualTableData] = useState({
    number: "",
    capacity: "",
    category: "Teras",
    status: "active",
  });
  const [manualCustomerData, setManualCustomerData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [categories, setCategories] = useState<any[]>([]);

  // Sayfa yüklendiğinde mevcut tabloları ve kategorileri kontrol et
  useEffect(() => {
    checkTables();
    fetchCategories();
  }, []);

  const initDB = async () => {
    try {
      setLoading(true);
      setError(null);
      setStatus("Veritabanı tabloları ve veriler kontrol ediliyor...");

      const result = await initializeDatabase();

      if (result.success) {
        setTables(result.tables || []);
        setStatus(
          `Veritabanı başarıyla hazırlandı. ${
            result.tables?.length || 0
          } masa mevcut.`
        );
      } else {
        setError("Veritabanı hazırlama işlemi sırasında bir hata oluştu.");
        setStatus("Hata oluştu, lütfen konsolu kontrol edin.");
      }

      await checkTables();
    } catch (error) {
      console.error("Veritabanı başlatma hatası:", error);
      setError(
        `Hata: ${error instanceof Error ? error.message : String(error)}`
      );
      setStatus("Hata oluştu, lütfen konsolu kontrol edin.");
    } finally {
      setLoading(false);
    }
  };

  const checkTables = async () => {
    try {
      setStatus("Veritabanı kontrol ediliyor...");
      const { data, error } = await supabase.from("tables").select("*");

      if (error) {
        throw error;
      }

      setTables(data || []);

      if (data && data.length > 0) {
        setStatus(`Tablolar başarıyla yüklendi. ${data.length} masa bulundu.`);
        console.log("Mevcut masalar:", data); // Masa ID'lerini logla
      } else {
        setStatus(
          "Tablolar kontrol edildi, fakat masa bulunamadı. Lütfen 'Veritabanını Başlat' butonuna tıklayın."
        );
      }
    } catch (error) {
      console.error("Tablo kontrol hatası:", error);
      setError(
        `Tablo kontrol hatası: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      setStatus("Veritabanı tabloları kontrol edilirken bir hata oluştu.");
    }
  };

  const addExampleTable = async () => {
    try {
      setLoading(true);
      setError(null);
      setStatus("Örnek masa ekleniyor...");

      // Benzersiz ID'ler oluştur
      const categoryId = uuidv4();
      const tableId = uuidv4();

      // Kategori ekleme
      const categoryData = {
        id: categoryId,
        name: "Teras",
        color: "#FF5722",
        border_color: "#E64A19",
        background_color: "#FFCCBC",
      };

      const { error: categoryError } = await supabase
        .from("table_categories")
        .insert(categoryData)
        .select()
        .single();

      if (categoryError) {
        console.error("Kategori ekleme hatası:", categoryError);
        setStatus("Kategori eklenirken bir hata oluştu.");
        setError(`Kategori Hatası: ${JSON.stringify(categoryError, null, 2)}`);
        return;
      }

      // Masa ekleme
      const tableData = {
        id: tableId,
        number: 1,
        capacity: 4,
        category_id: categoryId,
        status: "active",
      };

      const { error: tableError } = await supabase
        .from("tables")
        .insert(tableData)
        .select()
        .single();

      if (tableError) {
        console.error("Masa ekleme hatası:", tableError);
        setStatus("Masa eklenirken bir hata oluştu.");
        setError(`Masa Hatası: ${JSON.stringify(tableError, null, 2)}`);
        return;
      }

      setStatus("Örnek masa başarıyla eklendi!");
      await checkTables();
    } catch (error) {
      console.error("Örnek masa ekleme hatası:", error);
      // Daha detaylı hata gösterimi için JSON.stringify kullan
      let errorMessage = "Bilinmeyen hata";
      try {
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === "object") {
          errorMessage = JSON.stringify(error, null, 2);
        } else {
          errorMessage = String(error);
        }
      } catch (e) {
        errorMessage = "Hata detayları gösterilemiyor";
      }
      setError(`Genel Hata: ${errorMessage}`);
      setStatus("Örnek masa eklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const importFromFormitable = async () => {
    try {
      if (!restaurantKey || !formitableRestaurantId) {
        setError("Formitable Restaurant Key ve Restoran ID'si gereklidir");
        return;
      }

      setLoading(true);
      setError(null);
      setImportStatus(
        "Formitable API'sine bağlanılıyor ve veriler alınıyor..."
      );

      // Debug bilgisi
      console.log("Making request to Formitable API with:", {
        restaurantId: formitableRestaurantId,
        keyLength: restaurantKey.length,
        keyPreview: restaurantKey.substring(0, 5) + "...",
      });

      // Masaları çek - Kendi API proxy'mizi kullanıyoruz
      const tablesResponse = await fetch("/api/formitable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint: "tables",
          restaurantKey: restaurantKey,
          restaurantId: formitableRestaurantId,
        }),
      });

      if (!tablesResponse.ok) {
        const errorData = await tablesResponse.json();
        console.error("Tables fetch error:", errorData);

        // Detaylı hata gösterimi
        let errorMessage = `Masa verileri alınamadı: ${
          errorData.error || tablesResponse.status
        }`;
        if (errorData.attempts) {
          errorMessage += "\n\nDenenen URL'ler:";
          errorData.attempts.forEach((attempt: any, index: number) => {
            errorMessage += `\n${index + 1}. ${attempt.url} - ${
              attempt.status || "Hata"
            }: ${attempt.error || "Bilinmiyor"}`;
          });
        }

        throw new Error(errorMessage);
      }

      const tablesData = await tablesResponse.json();
      console.log("Tables data received:", tablesData);

      setImportStatus("Masalar alındı, müşteriler çekiliyor...");

      // Müşterileri çek - Kendi API proxy'mizi kullanıyoruz
      const customersResponse = await fetch("/api/formitable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint: "customers",
          restaurantKey: restaurantKey,
          restaurantId: formitableRestaurantId,
        }),
      });

      if (!customersResponse.ok) {
        const errorData = await customersResponse.json();
        console.error("Customers fetch error:", errorData);

        // Detaylı hata gösterimi
        let errorMessage = `Müşteri verileri alınamadı: ${
          errorData.error || customersResponse.status
        }`;
        if (errorData.attempts) {
          errorMessage += "\n\nDenenen URL'ler:";
          errorData.attempts.forEach((attempt: any, index: number) => {
            errorMessage += `\n${index + 1}. ${attempt.url} - ${
              attempt.status || "Hata"
            }: ${attempt.error || "Bilinmiyor"}`;
          });
        }

        throw new Error(errorMessage);
      }

      const customersData = await customersResponse.json();
      console.log("Customers data received:", customersData);

      setImportStatus("Veriler alındı, Supabase'e aktarılıyor...");

      // Veri yapılarını log'la
      console.log("Tables data structure:", {
        type: typeof tablesData,
        isArray: Array.isArray(tablesData),
        keys: typeof tablesData === "object" ? Object.keys(tablesData) : [],
        dataType: tablesData.data ? typeof tablesData.data : "no data property",
        dataIsArray: tablesData.data ? Array.isArray(tablesData.data) : false,
        dataLength:
          tablesData.data && Array.isArray(tablesData.data)
            ? tablesData.data.length
            : 0,
      });

      console.log("Customers data structure:", {
        type: typeof customersData,
        isArray: Array.isArray(customersData),
        keys:
          typeof customersData === "object" ? Object.keys(customersData) : [],
        dataType: customersData.data
          ? typeof customersData.data
          : "no data property",
        dataIsArray: customersData.data
          ? Array.isArray(customersData.data)
          : false,
        dataLength:
          customersData.data && Array.isArray(customersData.data)
            ? customersData.data.length
            : 0,
      });

      // Masaları Supabase'e ekle
      let importedTables = 0;

      // Veri yapısı muhtemelen farklı olabilir, API yanıtına göre ayarlayalım
      const tables = tablesData.data || tablesData.tables || [];

      for (const table of tables) {
        try {
          // Kategori kontrolü yap veya oluştur
          const categoryName = table.type || table.category || "Diğer";
          let categoryId = "";

          // Kategoriye bak
          const { data: existingCategories } = await supabase
            .from("table_categories")
            .select("*")
            .eq("name", categoryName)
            .maybeSingle();

          if (existingCategories) {
            categoryId = existingCategories.id;
          } else {
            // Yeni kategori oluştur
            const newCategoryId = uuidv4();
            const { error: categoryError } = await supabase
              .from("table_categories")
              .insert({
                id: newCategoryId,
                name: categoryName,
                color: "#2196F3",
                border_color: "#1976D2",
                background_color: "#BBDEFB",
              });

            if (categoryError) {
              console.error("Kategori oluşturma hatası:", categoryError);
              continue;
            }
            categoryId = newCategoryId;
          }

          // Masa ekle
          const { error: tableError } = await supabase.from("tables").insert({
            id: uuidv4(),
            number: table.number || table.id || importedTables + 1,
            capacity: table.capacity || table.seats || 4,
            category_id: categoryId,
            status: "active",
          });

          if (tableError) {
            console.error("Masa ekleme hatası:", tableError);
          } else {
            importedTables++;
          }
        } catch (err) {
          console.error("Masa işleme hatası:", err);
        }
      }

      // Müşterileri customers tablosuna ekleyelim
      let importedCustomers = 0;

      // Veri yapısı muhtemelen farklı olabilir, API yanıtına göre ayarlayalım
      const customers = customersData.data || customersData.customers || [];

      // Önce customers tablosunun varlığını kontrol edelim
      const { error: checkTableError } = await supabase
        .from("customers")
        .select("id", { count: "exact" })
        .limit(1);

      // Tablo yoksa oluştur
      if (checkTableError && checkTableError.code === "42P01") {
        // relation does not exist
        await supabase.rpc("create_customers_table");
      }

      for (const customer of customers) {
        try {
          const { error: customerError } = await supabase
            .from("customers")
            .insert({
              id: uuidv4(),
              name:
                customer.fullName ||
                `${customer.firstName || ""} ${customer.lastName || ""}`.trim(),
              email: customer.email || null,
              phone: customer.phone || customer.phoneNumber || null,
              notes: customer.notes || customer.comment || null,
              formitable_id: customer.id?.toString(),
              created_at: new Date().toISOString(),
            });

          if (customerError) {
            if (customerError.code === "42P01") {
              // relation does not exist
              console.warn("Customers tablosu bulunamadı, oluşturuluyor...");
              // Tablo yoksa oluştur ve tekrar dene
              await supabase.rpc("create_customers_table");

              // Tekrar deneyelim
              const { error: retryError } = await supabase
                .from("customers")
                .insert({
                  id: uuidv4(),
                  name:
                    customer.fullName ||
                    `${customer.firstName || ""} ${
                      customer.lastName || ""
                    }`.trim(),
                  email: customer.email || null,
                  phone: customer.phone || customer.phoneNumber || null,
                  notes: customer.notes || customer.comment || null,
                  formitable_id: customer.id?.toString(),
                  created_at: new Date().toISOString(),
                });

              if (!retryError) importedCustomers++;
            } else {
              console.error("Müşteri ekleme hatası:", customerError);
            }
          } else {
            importedCustomers++;
          }
        } catch (err) {
          console.error("Müşteri işleme hatası:", err);
        }
      }

      setImportedData({
        tables: importedTables,
        customers: importedCustomers,
      });

      setImportStatus(
        `Veri aktarımı tamamlandı! ${importedTables} masa ve ${importedCustomers} müşteri aktarıldı.`
      );
      await checkTables(); // Tabloları yenile
    } catch (error) {
      console.error("Formitable veri aktarım hatası:", error);
      setError(
        `Formitable veri aktarım hatası: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      setImportStatus("Veri aktarımı sırasında hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // Kategorileri getir
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("table_categories")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setCategories(data || []);

      // Eğer hiç kategori yoksa, varsayılan kategorileri oluştur
      if (!data || data.length === 0) {
        await createDefaultCategories();
        fetchCategories(); // Kategorileri tekrar al
      }
    } catch (error) {
      console.error("Kategori getirme hatası:", error);
    }
  };

  // Varsayılan kategorileri oluştur
  const createDefaultCategories = async () => {
    try {
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

      for (const category of defaultCategories) {
        await supabase.from("table_categories").insert(category);
      }
    } catch (error) {
      console.error("Varsayılan kategori oluşturma hatası:", error);
    }
  };

  // Manuel masa ekleme
  const addManualTable = async () => {
    try {
      setLoading(true);
      setError(null);

      // Girdi doğrulama
      if (
        !manualTableData.number ||
        !manualTableData.capacity ||
        !manualTableData.category
      ) {
        setError("Masa numarası, kapasite ve kategori bilgileri gereklidir.");
        return;
      }

      // Kategori ID'sini bul
      let categoryId = "";
      const foundCategory = categories.find(
        (cat) => cat.name === manualTableData.category
      );

      if (foundCategory) {
        categoryId = foundCategory.id;
      } else {
        // Kategori yoksa yeni oluştur
        const newCategoryId = uuidv4();
        const { error: categoryError } = await supabase
          .from("table_categories")
          .insert({
            id: newCategoryId,
            name: manualTableData.category,
            color: "#2196F3",
            border_color: "#1976D2",
            background_color: "#BBDEFB",
          });

        if (categoryError) {
          throw categoryError;
        }
        categoryId = newCategoryId;
      }

      // Masa ekle - UUID kullanma, veritabanının otomatik ID atamasına izin ver
      const { data: newTable, error: tableError } = await supabase
        .from("tables")
        .insert({
          // id alanını kaldırıyoruz, veritabanı otomatik olarak bir BIGINT ID atayacak
          number: parseInt(manualTableData.number),
          capacity: parseInt(manualTableData.capacity),
          category_id: categoryId,
          status: manualTableData.status,
        })
        .select() // Eklenen masanın bilgilerini almak için select ekledik
        .single();

      if (tableError) {
        throw tableError;
      }

      // Başarılı mesajı göster ve masaları yenile
      setStatus(
        `Masa #${manualTableData.number} başarıyla eklendi. (ID: ${newTable.id})`
      );
      console.log("Eklenen masa:", newTable);
      await checkTables();

      // Formu temizle
      setManualTableData({
        number: "",
        capacity: "",
        category: "Teras",
        status: "active",
      });
    } catch (error) {
      console.error("Manuel masa ekleme hatası:", error);
      setError(
        `Masa eklenirken hata oluştu: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  // Manuel müşteri ekleme
  const addManualCustomer = async () => {
    try {
      setLoading(true);
      setError(null);

      // Girdi doğrulama
      if (!manualCustomerData.name) {
        setError("Müşteri adı gereklidir.");
        return;
      }

      // Müşteri tablosunun varlığını kontrol et
      const { error: checkTableError } = await supabase
        .from("customers")
        .select("id")
        .limit(1);

      // Tablo yoksa oluştur
      if (checkTableError && checkTableError.code === "42P01") {
        // relation does not exist
        await supabase.rpc("create_customers_table");
      }

      // Müşteri ekle
      const { error: customerError } = await supabase.from("customers").insert({
        id: uuidv4(),
        name: manualCustomerData.name,
        email: manualCustomerData.email || null,
        phone: manualCustomerData.phone || null,
        notes: manualCustomerData.notes || null,
        created_at: new Date().toISOString(),
      });

      if (customerError) {
        throw customerError;
      }

      // Başarılı mesajı göster
      setStatus(`Müşteri "${manualCustomerData.name}" başarıyla eklendi.`);

      // Formu temizle
      setManualCustomerData({
        name: "",
        email: "",
        phone: "",
        notes: "",
      });
    } catch (error) {
      console.error("Manuel müşteri ekleme hatası:", error);
      setError(
        `Müşteri eklenirken hata oluştu: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Veritabanı Başlatma</h1>
      <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <h2 className="text-xl font-semibold text-yellow-800 mb-2">
          ⚠️ Dikkat
        </h2>
        <p className="text-yellow-700">
          Bu sayfa, Supabase veritabanınızı rezervasyon sistemi için gerekli
          tablolar ve varsayılan verilerle başlatacaktır. Bu işlem mevcut
          verileri etkileyebilir. Sadece ilk kurulum sırasında veya veritabanını
          sıfırlamak istediğinizde kullanın.
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Durum:</h2>
          <div
            className={`p-3 rounded ${
              status.includes("Hata") || error
                ? "bg-red-100 text-red-700"
                : status.includes("başarı") || status.includes("bulundu")
                ? "bg-green-100 text-green-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {status}
          </div>

          {error && (
            <div className="mt-2 p-3 bg-red-50 text-red-700 border border-red-200 rounded">
              <p className="font-medium">Hata Detayı:</p>
              <p>{error}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mb-6">
          <button
            onClick={initDB}
            disabled={loading}
            className={`flex-1 py-3 rounded-md text-white font-medium ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "İşlem Yapılıyor..." : "Veritabanını Başlat"}
          </button>

          <button
            onClick={checkTables}
            disabled={loading}
            className={`flex-1 py-3 rounded-md text-white font-medium ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            Tabloları Kontrol Et
          </button>
        </div>

        {tables.length === 0 && (
          <div className="mt-4 mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
            <p className="mb-3">
              Hiç masa bulunamadı. Eğer 'Veritabanını Başlat' butonu
              çalışmıyorsa, aşağıdaki buton ile manuel olarak örnek bir masa
              ekleyebilirsiniz:
            </p>
            <button
              onClick={addExampleTable}
              disabled={loading}
              className={`w-full py-2 rounded-md text-white font-medium ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-yellow-600 hover:bg-yellow-700"
              }`}
            >
              Manuel Olarak Örnek Masa Ekle
            </button>
          </div>
        )}

        {tables.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-3">Mevcut Masalar</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-2 px-4 border-b text-left">ID</th>
                    <th className="py-2 px-4 border-b text-left">Numara</th>
                    <th className="py-2 px-4 border-b text-left">Kapasite</th>
                    <th className="py-2 px-4 border-b text-left">Kategori</th>
                    <th className="py-2 px-4 border-b text-left">Durum</th>
                    <th className="py-2 px-4 border-b text-left">ID Tipi</th>
                  </tr>
                </thead>
                <tbody>
                  {tables.map((table) => (
                    <tr key={table.id} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border-b">{table.id}</td>
                      <td className="py-2 px-4 border-b">{table.number}</td>
                      <td className="py-2 px-4 border-b">{table.capacity}</td>
                      <td className="py-2 px-4 border-b">
                        {table.category_id}
                      </td>
                      <td className="py-2 px-4 border-b">{table.status}</td>
                      <td className="py-2 px-4 border-b">{typeof table.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-blue-800">
              <p>
                <strong>Not:</strong> Masa ID'leri sayısal değerlerdir.
                Rezervasyon oluştururken bu ID'leri kullanmalısınız. Aşağıdaki
                kod, rezervasyon oluştururken ID'nin nasıl kullanılacağını
                gösterir:
              </p>
              <pre className="mt-2 p-2 bg-gray-800 text-white rounded overflow-x-auto">
                {`fetch('/api/reservations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: "user-uuid",
    company_id: "company-id",
    date: "2023-12-31",
    time: "19:00",
    table_id: ${tables.length > 0 ? tables[0].id : "1"}, // Sayısal değer olmalı
    ...diğer alanlar
  })
})`}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Formitable veri aktarımı bölümü */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">
          Formitable'dan Veri Aktarımı
        </h2>
        <p className="mb-4 text-gray-600">
          Formitable API'sini kullanarak müşteri ve masa verilerinizi Supabase
          veritabanına aktarabilirsiniz.
        </p>

        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Formitable Restaurant Key
            </label>
            <input
              type="text"
              value={restaurantKey}
              onChange={(e) => setRestaurantKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Restaurant Key'i girin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Formitable Restoran ID (UUID)
            </label>
            <input
              type="text"
              value={formitableRestaurantId}
              onChange={(e) => setFormitableRestaurantId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Restoran UUID'sini girin"
            />
          </div>
        </div>

        <button
          onClick={importFromFormitable}
          disabled={loading || !restaurantKey || !formitableRestaurantId}
          className={`w-full py-3 rounded-md text-white font-medium ${
            loading || !restaurantKey || !formitableRestaurantId
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-purple-600 hover:bg-purple-700"
          }`}
        >
          {loading ? "Veriler Aktarılıyor..." : "Formitable'dan Verileri Aktar"}
        </button>

        {importStatus && (
          <div
            className={`mt-4 p-3 rounded ${
              importStatus.includes("hata")
                ? "bg-red-100 text-red-700"
                : importStatus.includes("tamamlandı")
                ? "bg-green-100 text-green-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {importStatus}
          </div>
        )}

        {importedData.tables && importedData.customers && (
          <div className="mt-4 flex gap-4">
            <div className="flex-1 p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="font-semibold text-green-800">
                Aktarılan Masalar
              </h3>
              <p className="text-3xl font-bold text-green-700">
                {importedData.tables}
              </p>
            </div>
            <div className="flex-1 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="font-semibold text-blue-800">
                Aktarılan Müşteriler
              </h3>
              <p className="text-3xl font-bold text-blue-700">
                {importedData.customers}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Manuel Veri Ekleme bölümü */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Manuel Veri Ekleme</h2>
        <p className="mb-4 text-gray-600">
          Formitable API bağlantısı sorunlu ise, aşağıdaki form ile masaları ve
          müşterileri manuel olarak ekleyebilirsiniz.
        </p>

        <div className="mb-4">
          <button
            onClick={() => setShowManualForm(!showManualForm)}
            className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            {showManualForm ? "Formu Gizle" : "Manuel Ekleme Formunu Göster"}
          </button>
        </div>

        {showManualForm && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Masa Ekleme Formu */}
            <div className="bg-gray-50 p-4 rounded border">
              <h3 className="text-lg font-medium mb-3">Masa Ekle</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Masa Numarası
                  </label>
                  <input
                    type="number"
                    value={manualTableData.number}
                    onChange={(e) =>
                      setManualTableData({
                        ...manualTableData,
                        number: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kapasite
                  </label>
                  <input
                    type="number"
                    value={manualTableData.capacity}
                    onChange={(e) =>
                      setManualTableData({
                        ...manualTableData,
                        capacity: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="4"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kategori
                  </label>
                  <select
                    value={manualTableData.category}
                    onChange={(e) =>
                      setManualTableData({
                        ...manualTableData,
                        category: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Durum
                  </label>
                  <select
                    value={manualTableData.status}
                    onChange={(e) =>
                      setManualTableData({
                        ...manualTableData,
                        status: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Pasif</option>
                  </select>
                </div>

                <button
                  onClick={addManualTable}
                  disabled={loading}
                  className={`w-full py-2 rounded-md text-white font-medium ${
                    loading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {loading ? "Ekleniyor..." : "Masa Ekle"}
                </button>
              </div>
            </div>

            {/* Müşteri Ekleme Formu */}
            <div className="bg-gray-50 p-4 rounded border">
              <h3 className="text-lg font-medium mb-3">Müşteri Ekle</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Müşteri Adı
                  </label>
                  <input
                    type="text"
                    value={manualCustomerData.name}
                    onChange={(e) =>
                      setManualCustomerData({
                        ...manualCustomerData,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Ahmet Yılmaz"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-posta
                  </label>
                  <input
                    type="email"
                    value={manualCustomerData.email}
                    onChange={(e) =>
                      setManualCustomerData({
                        ...manualCustomerData,
                        email: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="ahmet@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={manualCustomerData.phone}
                    onChange={(e) =>
                      setManualCustomerData({
                        ...manualCustomerData,
                        phone: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="0555 123 4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notlar
                  </label>
                  <textarea
                    value={manualCustomerData.notes}
                    onChange={(e) =>
                      setManualCustomerData({
                        ...manualCustomerData,
                        notes: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Müşteri notları..."
                    rows={3}
                  ></textarea>
                </div>

                <button
                  onClick={addManualCustomer}
                  disabled={loading}
                  className={`w-full py-2 rounded-md text-white font-medium ${
                    loading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {loading ? "Ekleniyor..." : "Müşteri Ekle"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-500">
        <p>
          Bu sayfayı kullandıktan sonra, veritabanınız hazır olacak ve
          rezervasyon sistemi doğru şekilde çalışacaktır.{" "}
          {tables.length > 0 && "Şu anda masalarınız başarıyla yüklenmiştir."}
        </p>
        <p className="mt-2">
          <a href="/admin" className="text-blue-600 hover:underline">
            Yönetim Paneline Dön
          </a>
        </p>
      </div>
    </div>
  );
}
