"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

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
      backgroundColor: randomColor, // Arkaplan rengi tam opak
    };

    setTableSettings({
      ...tableSettings,
      categories: [...tableSettings.categories, newCategory],
    });
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
    const rgbaColor = hexToRgba(hexColor, opacity);
    updateCategory(id, "color", rgbaColor);
  };

  // HEX rengini RGBA'dan çıkarma
  const getRgbaValues = (rgba: string) => {
    // rgba değerini parçalara ayır
    const matches = rgba.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);

    if (!matches) {
      // Eğer rgba formatında değilse, varsayılan değerler döndür
      return { hex: "#000000", opacity: 1 };
    }

    // RGB değerlerini al ve HEX formatına çevir
    const r = parseInt(matches[1]);
    const g = parseInt(matches[2]);
    const b = parseInt(matches[3]);
    const opacity = parseFloat(matches[4]);

    // RGB'yi HEX'e çevir
    const hex =
      "#" +
      r.toString(16).padStart(2, "0") +
      g.toString(16).padStart(2, "0") +
      b.toString(16).padStart(2, "0");

    return { hex, opacity };
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
                          value={getRgbaValues(category.color).hex}
                          onChange={(e) => {
                            // Mevcut opacity değerini koru
                            const currentOpacity = getRgbaValues(
                              category.color
                            ).opacity;
                            updateCategoryColor(
                              category.id,
                              e.target.value,
                              currentOpacity
                            );
                          }}
                          className="w-full h-8"
                        />
                        <div className="flex items-center">
                          <span className="text-xs mr-2">Şeffaflık:</span>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={getRgbaValues(category.color).opacity}
                            onChange={(e) => {
                              // Mevcut hex değerini koru
                              const currentHex = getRgbaValues(
                                category.color
                              ).hex;
                              updateCategoryColor(
                                category.id,
                                currentHex,
                                parseFloat(e.target.value)
                              );
                            }}
                            className="w-full"
                          />
                          <span className="text-xs ml-2">
                            {getRgbaValues(category.color).opacity.toFixed(1)}
                          </span>
                        </div>
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
    </div>
  );
}
