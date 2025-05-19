"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { mockTables, mockTableCategories } from "@/lib/supabase/tables";
import type { Table } from "@/lib/supabase/tables";

// Masa kategorisi arayüzü güncelleniyor
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

  // Firma ayarlarını kaydetmek için fonksiyon
  const saveCompanySettings = () => {
    // API çağrısı yapılacak
    localStorage.setItem("companySettings", JSON.stringify(companySettings));
    toast.success("Firma ayarları kaydedildi!");
  };

  // Masa ayarlarını kaydetmek için fonksiyon
  const saveTableSettings = () => {
    // API çağrısı yapılacak
    localStorage.setItem("tableSettings", JSON.stringify(tableSettings));
    toast.success("Masa ayarları kaydedildi!");
  };

  // Saat ayarlarını kaydetmek için fonksiyon
  const saveTimeSettings = () => {
    // API çağrısı yapılacak
    localStorage.setItem("timeSettings", JSON.stringify(timeSettings));
    toast.success("Saat ayarları kaydedildi!");
  };

  // Firma ayarlarını yüklemek için useEffect
  useEffect(() => {
    const savedCompanySettings = localStorage.getItem("companySettings");
    const savedTableSettings = localStorage.getItem("tableSettings");
    const savedTimeSettings = localStorage.getItem("timeSettings");

    if (savedCompanySettings) {
      setCompanySettings(JSON.parse(savedCompanySettings));
    }

    if (savedTableSettings) {
      setTableSettings(JSON.parse(savedTableSettings));
    }

    if (savedTimeSettings) {
      setTimeSettings(JSON.parse(savedTimeSettings));
    }
  }, []);

  // Masaları yükle
  useEffect(() => {
    loadTables();
  }, []);

  // Masaları yükleme fonksiyonu
  const loadTables = async () => {
    try {
      console.log("Masalar yükleniyor...");
      // Gerçek API çağrısı yerine mock veri kullanıyoruz
      setTablesList({ list: mockTables });

      // Kategorileri de mock veriden yükle
      setTableSettings({
        categories: mockTableCategories.map((cat) => ({
          id: cat.id,
          name: cat.name,
          color: cat.color,
          borderColor: cat.border_color,
          backgroundColor: cat.background_color,
        })),
      });

      console.log("Yüklenen masalar:", mockTables);
    } catch (error: any) {
      console.error("Masalar yüklenirken detaylı hata:", error);
      toast.error(
        `Masalar yüklenirken bir hata oluştu: ${error?.message || error}`
      );
    }
  };

  // Yeni masa ekleme fonksiyonu
  const addTable = async () => {
    try {
      console.log("Yeni masa ekleniyor...");
      const newTable = {
        id: `t${tablesList.list.length + 1}`,
        number: tablesList.list.length + 1,
        capacity: 4,
        category_id: tableSettings.categories[0]?.id || "1",
        status: "Available",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      console.log("Eklenecek masa bilgileri:", newTable);

      // Gerçek API çağrısı yerine state güncelleme
      setTablesList({ list: [...tablesList.list, newTable] });
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

      // Gerçek API çağrısı yerine state güncelleme
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

      // Gerçek API çağrısı yerine state güncelleme
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
  const addCategory = () => {
    const randomColor =
      "#" +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0");
    const newCategory = {
      id: Date.now().toString(),
      name: "Yeni Kategori",
      color: hexToRgba(randomColor, 0.8), // RGBA formatında şeffaf renk
      borderColor: randomColor, // Kenarlık rengi tam opak
      backgroundColor: getLighterColor(randomColor), // Açık tonda arkaplan rengi
    };

    setTableSettings({
      ...tableSettings,
      categories: [...tableSettings.categories, newCategory],
    });
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
  const removeCategory = (id: string) => {
    setTableSettings({
      ...tableSettings,
      categories: tableSettings.categories.filter(
        (category) => category.id !== id
      ),
    });
  };

  // Kategori güncelleme fonksiyonu
  const updateCategory = (id: string, field: string, value: string) => {
    setTableSettings({
      ...tableSettings,
      categories: tableSettings.categories.map((category) =>
        category.id === id ? { ...category, [field]: value } : category
      ),
    });
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
  const updateCategoryColor = (
    id: string,
    hexColor: string,
    opacity: number
  ) => {
    updateCategory(id, "color", hexToRgba(hexColor, opacity));
    updateCategory(id, "borderColor", hexColor);
    updateCategory(id, "backgroundColor", getLighterColor(hexColor));
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
                            updateCategoryColor(category.id, e.target.value, 1);
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
