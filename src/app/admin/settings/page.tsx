"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
  const [tableSettings, setTableSettings] = useState({
    categories: [
      { id: "1", name: "Teras", color: "#3498db", borderColor: "#2980b9" },
      { id: "2", name: "Bahçe", color: "#2ecc71", borderColor: "#27ae60" },
      { id: "3", name: "İç Mekan", color: "#e74c3c", borderColor: "#c0392b" },
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
    alert("Firma ayarları kaydedildi!");
  };

  // Masa ayarlarını kaydetmek için fonksiyon
  const saveTableSettings = () => {
    // API çağrısı yapılacak
    localStorage.setItem("tableSettings", JSON.stringify(tableSettings));
    alert("Masa ayarları kaydedildi!");
  };

  // Saat ayarlarını kaydetmek için fonksiyon
  const saveTimeSettings = () => {
    // API çağrısı yapılacak
    localStorage.setItem("timeSettings", JSON.stringify(timeSettings));
    alert("Saat ayarları kaydedildi!");
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
    const newCategory = {
      id: Date.now().toString(),
      name: "Yeni Kategori",
      color: "#9b59b6",
      borderColor: "#8e44ad",
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
                      <input
                        type="color"
                        value={category.color}
                        onChange={(e) =>
                          updateCategory(category.id, "color", e.target.value)
                        }
                        className="w-full"
                      />
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
                        className="w-full"
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
