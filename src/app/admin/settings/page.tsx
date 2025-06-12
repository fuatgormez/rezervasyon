"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import type { Table } from "@/models/tables";
import { db } from "@/config/firebase";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { UserPreferences, SettingsService } from "@/services/firebase.service";

// Masa kategorisi arayüzü
interface TableCategory {
  id: string;
  name: string;
  color: string; // Rezervasyon rengi (RGBA)
  borderColor: string; // Kenarlık rengi (HEX)
  backgroundColor: string; // Arkaplan rengi (HEX)
}

export default function SettingsPage() {
  // Firma ayarları için state
  const [companySettings, setCompanySettings] = useState({
    name: "Rezervasyon Sistemi",
    logo: "/logo.png",
    phone: "+90 555 123 45 67",
    address: "İstanbul, Türkiye",
    email: "info@rezervasyon.com",
  });

  // Masa ayarları için state
  const [tableSettings, setTableSettings] = useState<{
    categories: TableCategory[];
  }>({
    categories: [
      {
        id: "1",
        name: "Teras",
        color: "rgba(52, 152, 219, 0.8)",
        borderColor: "#2980b9",
        backgroundColor: "#f0f9ff", // Açık mavi arkaplan
      },
      {
        id: "2",
        name: "Bahçe",
        color: "rgba(46, 204, 113, 0.8)",
        borderColor: "#27ae60",
        backgroundColor: "#f0fdf4", // Açık yeşil arkaplan
      },
      {
        id: "3",
        name: "İç Mekan",
        color: "rgba(231, 76, 60, 0.8)",
        borderColor: "#c0392b",
        backgroundColor: "#fef2f2", // Açık kırmızı arkaplan
      },
    ],
  });

  // Saat ayarları için state
  const [timeSettings, setTimeSettings] = useState({
    openingTime: "07:00",
    closingTime: "02:00",
    reservationDuration: 120, // dakika cinsinden
  });

  // Masa listesi için state
  const [tablesList, setTablesList] = useState<{
    list: Array<any>;
  }>({
    list: [],
  });

  // Yükleniyor göstergesi
  const [loading, setLoading] = useState({
    company: false,
    tables: false,
    time: false,
    tableList: false,
  });

  // Firma ayarlarını kaydetmek için fonksiyon
  const saveCompanySettings = async () => {
    try {
      setLoading((prev) => ({ ...prev, company: true }));

      // Firebase'e kaydet
      await SettingsService.updateSettings({
        company: companySettings,
      });

      toast.success("Firma ayarları kaydedildi!");
    } catch (error: any) {
      console.error("Firma ayarları kaydedilirken hata:", error);
      toast.error(`Hata: ${error.message || "Bilinmeyen bir hata oluştu"}`);
    } finally {
      setLoading((prev) => ({ ...prev, company: false }));
    }
  };

  // Masa ayarlarını kaydetmek için fonksiyon
  const saveTableSettings = async () => {
    try {
      setLoading((prev) => ({ ...prev, tables: true }));

      // Firebase'e kaydet
      await SettingsService.updateSettings({
        table_categories: tableSettings.categories,
      });

      toast.success("Masa ayarları kaydedildi!");
    } catch (error: any) {
      console.error("Masa ayarları kaydedilirken hata:", error);
      toast.error(`Hata: ${error.message || "Bilinmeyen bir hata oluştu"}`);
    } finally {
      setLoading((prev) => ({ ...prev, tables: false }));
    }
  };

  // Saat ayarlarını kaydetmek için fonksiyon
  const saveTimeSettings = async () => {
    try {
      setLoading((prev) => ({ ...prev, time: true }));

      // Firebase'e kaydet
      await SettingsService.updateSettings({
        working_hours: {
          opening: timeSettings.openingTime,
          closing: timeSettings.closingTime,
        },
        reservation_duration: timeSettings.reservationDuration,
      });

      toast.success("Saat ayarları kaydedildi!");
    } catch (error: any) {
      console.error("Saat ayarları kaydedilirken hata:", error);
      toast.error(`Hata: ${error.message || "Bilinmeyen bir hata oluştu"}`);
    } finally {
      setLoading((prev) => ({ ...prev, time: false }));
    }
  };

  // Ayarları yüklemek için useEffect
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Firebase'den ayarları getir
        const settings = await SettingsService.getSettings();

        // Firma ayarları
        if (settings.company) {
          setCompanySettings(settings.company);
        }

        // Masa kategorileri
        if (settings.table_categories && settings.table_categories.length > 0) {
          setTableSettings({
            categories: settings.table_categories,
          });
        }

        // Çalışma saatleri
        if (settings.working_hours) {
          setTimeSettings((prev) => ({
            ...prev,
            openingTime: settings.working_hours?.opening || "07:00",
            closingTime: settings.working_hours?.closing || "02:00",
          }));
        }

        // Rezervasyon süresi
        if (settings.reservation_duration) {
          setTimeSettings((prev) => ({
            ...prev,
            reservationDuration: settings.reservation_duration || 120,
          }));
        }
      } catch (error) {
        console.error("Ayarlar yüklenirken hata:", error);
        toast.error("Ayarlar yüklenirken bir hata oluştu.");
      }
    };

    loadSettings();
  }, []);

  // Masaları yükle
  useEffect(() => {
    loadTables();
  }, []);

  // Masaları yükleme fonksiyonu
  const loadTables = async () => {
    try {
      setLoading((prev) => ({ ...prev, tableList: true }));
      console.log("Masalar yükleniyor...");

      // Firebase'den masaları getir
      const tablesRef = collection(db, "tables");
      const tablesQuery = query(tablesRef, orderBy("number", "asc"));
      const tablesSnapshot = await getDocs(tablesQuery);

      if (!tablesSnapshot.empty) {
        const tables = tablesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          number: doc.data().number || 0,
          capacity: doc.data().capacity || 4,
          category_id: doc.data().category_id || "1",
          status: doc.data().status || "active",
        }));

        setTablesList({ list: tables });
        console.log("Yüklenen masalar:", tables);
      } else {
        // Gerçek veritabanında masa yok
        setTablesList({ list: [] });
        toast.error(
          "Hiç masa verisi bulunamadı. Yeni masa ekleyebilirsiniz veya /init-db sayfasını ziyaret edebilirsiniz."
        );
      }

      // Firebase'den kategorileri getir
      const categoriesRef = collection(db, "table_categories");
      const categoriesSnapshot = await getDocs(categoriesRef);

      if (!categoriesSnapshot.empty) {
        const categories = categoriesSnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || "",
          color: doc.data().color || "rgba(52, 152, 219, 0.8)",
          borderColor: doc.data().borderColor || "#2980b9",
          backgroundColor: doc.data().backgroundColor || "#f0f9ff",
        }));

        setTableSettings({ categories });
      }
    } catch (error: any) {
      console.error("Masalar yüklenirken detaylı hata:", error);
      toast.error(
        `Masalar yüklenirken bir hata oluştu: ${error?.message || error}`
      );
    } finally {
      setLoading((prev) => ({ ...prev, tableList: false }));
    }
  };

  // Yeni masa ekleme fonksiyonu
  const addTable = async () => {
    try {
      console.log("Yeni masa ekleniyor...");

      // En yüksek masa numarasını bul
      const maxTableNumber =
        tablesList.list.length > 0
          ? Math.max(...tablesList.list.map((t) => t.number))
          : 0;

      const newTable = {
        number: maxTableNumber + 1,
        capacity: 4,
        category_id: tableSettings.categories[0]?.id || "1",
        status: "active",
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      console.log("Eklenecek masa bilgileri:", newTable);

      // Firebase'e kaydet
      const tableRef = await addDoc(collection(db, "tables"), newTable);

      // State'i güncelle
      const savedTable = {
        id: tableRef.id,
        ...newTable,
      };

      setTablesList({ list: [...tablesList.list, savedTable] });
      toast.success("Yeni masa eklendi!");
    } catch (error: any) {
      console.error("Masa eklenirken detaylı hata:", error);
      toast.error(
        `Masa eklenirken bir hata oluştu: ${error?.message || error}`
      );
    }
  };

  // Masa güncelleme fonksiyonu
  const updateTable = async (id: string, data: any) => {
    try {
      console.log(`${id} ID'li masa güncelleniyor:`, data);

      // Firebase'de güncelle
      const tableRef = doc(db, "tables", id);
      await updateDoc(tableRef, {
        ...data,
        updated_at: Timestamp.now(),
      });

      // State'i güncelle
      setTablesList({
        list: tablesList.list.map((table) =>
          table.id === id ? { ...table, ...data } : table
        ),
      });

      toast.success("Masa güncellendi!");
    } catch (error: any) {
      console.error("Masa güncellenirken detaylı hata:", error);
      toast.error(
        `Masa güncellenirken bir hata oluştu: ${error?.message || error}`
      );
    }
  };

  // Masa silme fonksiyonu
  const deleteTable = async (id: string) => {
    try {
      console.log(`${id} ID'li masa siliniyor...`);

      // Firebase'den sil
      const tableRef = doc(db, "tables", id);
      await deleteDoc(tableRef);

      // State'i güncelle
      setTablesList({
        list: tablesList.list.filter((table) => table.id !== id),
      });

      toast.success("Masa silindi!");
    } catch (error: any) {
      console.error("Masa silinirken detaylı hata:", error);
      toast.error(
        `Masa silinirken bir hata oluştu: ${error?.message || error}`
      );
    }
  };

  // Kategori ekleme fonksiyonu
  const addCategory = async () => {
    try {
      const randomColor =
        "#" +
        Math.floor(Math.random() * 16777215)
          .toString(16)
          .padStart(6, "0");

      const newCategory = {
        name: "Yeni Kategori",
        color: hexToRgba(randomColor, 0.8), // RGBA formatında şeffaf renk
        borderColor: randomColor, // Kenarlık rengi tam opak
        backgroundColor: getLighterColor(randomColor), // Açık tonda arkaplan rengi
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      };

      // Firebase'e kaydet
      const categoryRef = await addDoc(
        collection(db, "table_categories"),
        newCategory
      );

      // State'i güncelle
      const savedCategory = {
        id: categoryRef.id,
        ...newCategory,
      };

      setTableSettings({
        ...tableSettings,
        categories: [...tableSettings.categories, savedCategory],
      });

      toast.success("Yeni kategori eklendi!");
    } catch (error: any) {
      console.error("Kategori eklenirken hata:", error);
      toast.error(`Hata: ${error.message || "Bilinmeyen bir hata oluştu"}`);
    }
  };

  // Açık renk oluşturma fonksiyonu
  const getLighterColor = (hexColor: string, factor: number = 0.92): string => {
    // HEX değerini RGB'ye çevir
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);

    // Her bir renge açıklık ekle (beyaza doğru kaydir)
    const newR = Math.min(255, r + Math.round((255 - r) * factor));
    const newG = Math.min(255, g + Math.round((255 - g) * factor));
    const newB = Math.min(255, b + Math.round((255 - b) * factor));

    // RGB'yi HEX'e çevir
    return `#${newR.toString(16).padStart(2, "0")}${newG
      .toString(16)
      .padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
  };

  // Kategori silme fonksiyonu
  const removeCategory = async (id: string) => {
    try {
      // Firebase'den sil
      const categoryRef = doc(db, "table_categories", id);
      await deleteDoc(categoryRef);

      // State'i güncelle
      setTableSettings({
        ...tableSettings,
        categories: tableSettings.categories.filter(
          (category) => category.id !== id
        ),
      });

      toast.success("Kategori silindi!");
    } catch (error: any) {
      console.error("Kategori silinirken hata:", error);
      toast.error(`Hata: ${error.message || "Bilinmeyen bir hata oluştu"}`);
    }
  };

  // Kategori güncelleme fonksiyonu
  const updateCategory = async (id: string, field: string, value: string) => {
    try {
      // Önce state'i güncelle (UI için hızlı yanıt)
      setTableSettings({
        ...tableSettings,
        categories: tableSettings.categories.map((category) =>
          category.id === id ? { ...category, [field]: value } : category
        ),
      });

      // Firebase'de güncelle (asenkron olarak)
      const categoryRef = doc(db, "table_categories", id);
      await updateDoc(categoryRef, {
        [field]: value,
        updated_at: Timestamp.now(),
      });
    } catch (error: any) {
      console.error("Kategori güncellenirken hata:", error);
      toast.error(`Hata: ${error.message || "Bilinmeyen bir hata oluştu"}`);
    }
  };

  // RGBA renk değerini HEX değerine çevirme
  const hexToRgba = (hex: string, opacity: number = 1) => {
    // HEX değerini RGB'ye çevir
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    // RGBA formatında döndür
    return `rgba(${r}, ${g}, ${b}, ${opacity.toFixed(1)})`;
  };

  // Kategori renk güncellemesi için özel fonksiyon
  const updateCategoryColor = async (
    id: string,
    hexColor: string,
    opacity: number
  ) => {
    try {
      const rgbaColor = hexToRgba(hexColor, opacity);
      const bgColor = getLighterColor(hexColor);

      // Önce state'i güncelle (UI için hızlı yanıt)
      setTableSettings({
        ...tableSettings,
        categories: tableSettings.categories.map((category) =>
          category.id === id
            ? {
                ...category,
                color: rgbaColor,
                borderColor: hexColor,
                backgroundColor: bgColor,
              }
            : category
        ),
      });

      // Firebase'de güncelle
      const categoryRef = doc(db, "table_categories", id);
      await updateDoc(categoryRef, {
        color: rgbaColor,
        borderColor: hexColor,
        backgroundColor: bgColor,
        updated_at: Timestamp.now(),
      });
    } catch (error: any) {
      console.error("Kategori rengi güncellenirken hata:", error);
      toast.error(`Hata: ${error.message || "Bilinmeyen bir hata oluştu"}`);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Sistem Ayarları</h1>
        <Link
          href="/admin"
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Admin Paneline Dön
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Firma Ayarları */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Firma Ayarları</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Firma Adı
              </label>
              <input
                type="text"
                value={companySettings.name}
                onChange={(e) =>
                  setCompanySettings({
                    ...companySettings,
                    name: e.target.value,
                  })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Logo URL
              </label>
              <input
                type="text"
                value={companySettings.logo}
                onChange={(e) =>
                  setCompanySettings({
                    ...companySettings,
                    logo: e.target.value,
                  })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Telefon
              </label>
              <input
                type="text"
                value={companySettings.phone}
                onChange={(e) =>
                  setCompanySettings({
                    ...companySettings,
                    phone: e.target.value,
                  })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Adres
              </label>
              <input
                type="text"
                value={companySettings.address}
                onChange={(e) =>
                  setCompanySettings({
                    ...companySettings,
                    address: e.target.value,
                  })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                E-posta
              </label>
              <input
                type="email"
                value={companySettings.email}
                onChange={(e) =>
                  setCompanySettings({
                    ...companySettings,
                    email: e.target.value,
                  })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>

            <button
              onClick={saveCompanySettings}
              className="mt-4 w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600"
            >
              Firma Ayarlarını Kaydet
            </button>
          </div>
        </div>

        {/* Saat Ayarları */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Saat Ayarları</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Açılış Saati
              </label>
              <input
                type="time"
                value={timeSettings.openingTime}
                onChange={(e) =>
                  setTimeSettings({
                    ...timeSettings,
                    openingTime: e.target.value,
                  })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Kapanış Saati
              </label>
              <input
                type="time"
                value={timeSettings.closingTime}
                onChange={(e) =>
                  setTimeSettings({
                    ...timeSettings,
                    closingTime: e.target.value,
                  })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Varsayılan Rezervasyon Süresi (dakika)
              </label>
              <input
                type="number"
                min="30"
                step="30"
                value={timeSettings.reservationDuration}
                onChange={(e) =>
                  setTimeSettings({
                    ...timeSettings,
                    reservationDuration: parseInt(e.target.value),
                  })
                }
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>

            <button
              onClick={saveTimeSettings}
              className="mt-4 w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600"
            >
              Saat Ayarlarını Kaydet
            </button>
          </div>
        </div>

        {/* Masa Kategorileri */}
        <div className="bg-white p-6 rounded-lg shadow-md md:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Masa Kategorileri</h2>
            <button
              onClick={addCategory}
              className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600"
            >
              Kategori Ekle
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kategori Adı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Renk
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kenarlık Rengi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Arkaplan Rengi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tableSettings.categories.map((category) => (
                  <tr key={category.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={category.name}
                        onChange={(e) =>
                          updateCategory(category.id, "name", e.target.value)
                        }
                        className="border border-gray-300 rounded-md shadow-sm p-1 w-full"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-2">
                        <input
                          type="color"
                          value={category.color}
                          onChange={(e) => {
                            // hex değerini RGBA'ya çevir ve güncelle
                            const hexValue = e.target.value;
                            updateCategoryColor(category.id, hexValue, 0.8);
                          }}
                          className="w-full h-8"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="color"
                        value={category.borderColor}
                        onChange={(e) =>
                          updateCategory(
                            category.id,
                            "borderColor",
                            e.target.value
                          )
                        }
                        className="w-full h-8"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="color"
                        value={category.backgroundColor}
                        onChange={(e) =>
                          updateCategory(
                            category.id,
                            "backgroundColor",
                            e.target.value
                          )
                        }
                        className="w-full h-8"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => removeCategory(category.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={saveTableSettings}
            className="mt-4 w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600"
          >
            Masa Kategori Ayarlarını Kaydet
          </button>
        </div>
      </div>

      {/* Masa Yönetimi */}
      <div className="bg-white p-6 rounded-lg shadow-md mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Masa Yönetimi</h2>
          <button
            onClick={addTable}
            className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600"
          >
            Yeni Masa Ekle
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Masa No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kapasite
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kategori
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tablesList.list.map((table) => (
                <tr key={table.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      value={table.number}
                      onChange={(e) =>
                        updateTable(table.id, {
                          number: parseInt(e.target.value),
                        })
                      }
                      className="border border-gray-300 rounded-md shadow-sm p-1 w-20"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      value={table.capacity}
                      onChange={(e) =>
                        updateTable(table.id, {
                          capacity: parseInt(e.target.value),
                        })
                      }
                      className="border border-gray-300 rounded-md shadow-sm p-1 w-20"
                      min="1"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={table.category_id}
                      onChange={(e) =>
                        updateTable(table.id, {
                          category_id: e.target.value,
                        })
                      }
                      className="border border-gray-300 rounded-md shadow-sm p-1"
                    >
                      {tableSettings.categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={table.status}
                      onChange={(e) =>
                        updateTable(table.id, {
                          status: e.target.value as "active" | "inactive",
                        })
                      }
                      className="border border-gray-300 rounded-md shadow-sm p-1"
                    >
                      <option value="active">Aktif</option>
                      <option value="inactive">Pasif</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => deleteTable(table.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
