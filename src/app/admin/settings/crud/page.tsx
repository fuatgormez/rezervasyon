"use client";

import { useState, useEffect } from "react";
import { useAuthContext } from "@/lib/firebase/context";
import { db } from "@/lib/firebase/config";
import { ref, get, set, push, remove, update } from "firebase/database";
import toast from "react-hot-toast";
import Link from "next/link";

export default function CrudSettingsPage() {
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);

  const [data, setData] = useState<any>({
    customers: [],
    companies: [],
    restaurants: [],
    categories: [],
    tables: [],
    waiters: [],
  });

  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState("");
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const collections = [
        "customers",
        "companies",
        "restaurants",
        "categories",
        "tables",
        "waiters",
      ];
      const promises = collections.map(async (collection) => {
        const snapshot = await get(ref(db, collection));
        if (snapshot.exists()) {
          const data = snapshot.val();
          return {
            [collection]: Object.entries(data).map(
              ([id, item]: [string, any]) => ({ id, ...item })
            ),
          };
        }
        return { [collection]: [] };
      });

      const results = await Promise.all(promises);
      const newData = results.reduce(
        (acc, result) => ({ ...acc, ...result }),
        {}
      );
      setData(newData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Veriler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const contextualFormData = { ...formData };

      if (modalType === "restaurants" && selectedCompany) {
        contextualFormData.companyId = selectedCompany.id;
      }

      if (
        (modalType === "tables" ||
          modalType === "waiters" ||
          modalType === "categories") &&
        selectedRestaurant
      ) {
        contextualFormData.restaurantId = selectedRestaurant.id;
      }

      if (editingItem) {
        await update(ref(db, `${modalType}/${editingItem.id}`), {
          ...contextualFormData,
          updatedAt: new Date().toISOString(),
        });
        toast.success("Güncellendi!");
      } else {
        const newRef = push(ref(db, modalType));
        await set(newRef, {
          ...contextualFormData,
          createdAt: new Date().toISOString(),
        });
        toast.success("Eklendi!");
      }

      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({});
      setModalType("");
      loadAllData();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Kaydetme hatası!");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (type: string, id: string) => {
    if (!confirm("Silmek istediğinizden emin misiniz?")) return;

    try {
      setLoading(true);
      await remove(ref(db, `${type}/${id}`));
      toast.success("Silindi!");
      loadAllData();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Silme hatası!");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type: string, item?: any) => {
    setModalType(type);
    setEditingItem(item);
    setFormData(item || {});
    setIsModalOpen(true);
  };

  // Get filtered data
  const getFilteredRestaurants = () => {
    return selectedCompany
      ? data.restaurants.filter((r: any) => r.companyId === selectedCompany.id)
      : [];
  };

  const getFilteredData = (type: string) => {
    if (!selectedRestaurant) return [];

    switch (type) {
      case "customers":
        return data.customers || [];
      case "categories":
        return data.categories.filter(
          (c: any) => c.restaurantId === selectedRestaurant.id
        );
      case "tables":
        return data.tables.filter(
          (t: any) => t.restaurantId === selectedRestaurant.id
        );
      case "waiters":
        return data.waiters.filter(
          (w: any) => w.restaurantId === selectedRestaurant.id
        );
      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              🏢 İşletme Yönetim Paneli
            </h1>
            <p className="text-gray-600 mt-2">
              Firma → Restoran → Alt Veriler mantığında yönetim
            </p>
          </div>
          <Link
            href="/admin/settings"
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            ← Geri Dön
          </Link>
        </div>

        {/* Breadcrumb */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span className="font-medium">Konum:</span>
            <button
              onClick={() => {
                setSelectedCompany(null);
                setSelectedRestaurant(null);
              }}
              className="text-blue-600 hover:underline"
            >
              Ana Sayfa
            </button>
            {selectedCompany && (
              <>
                <span>→</span>
                <span className="text-blue-600">{selectedCompany.name}</span>
              </>
            )}
            {selectedRestaurant && (
              <>
                <span>→</span>
                <span className="text-blue-600">{selectedRestaurant.name}</span>
              </>
            )}
          </div>
        </div>

        {/* Üst Panel - Firma ve Restoran Seçimi */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Sol Panel - Firmalar */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                🏢 Firmalar
              </h2>
              <button
                onClick={() => openModal("companies")}
                className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm"
              >
                + Ekle
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {data.companies.map((company: any) => (
                <div
                  key={company.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedCompany?.id === company.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => {
                    setSelectedCompany(company);
                    setSelectedRestaurant(null);
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {company.name}
                      </h3>
                      <p className="text-sm text-gray-500">{company.email}</p>
                      <p className="text-sm text-gray-500">{company.phone}</p>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal("companies", company);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete("companies", company.id);
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sağ Panel - Restoranlar */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                🍽️{" "}
                {selectedCompany
                  ? `${selectedCompany.name} Restoranları`
                  : "Restoranlar"}
              </h2>
              {selectedCompany && (
                <button
                  onClick={() => openModal("restaurants")}
                  className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm"
                >
                  + Ekle
                </button>
              )}
            </div>

            {!selectedCompany ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">🏢</div>
                <div className="text-lg font-medium mb-2">Firma Seçin</div>
                <div>Restoranları görmek için soldan bir firma seçin</div>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {getFilteredRestaurants().map((restaurant: any) => (
                  <div
                    key={restaurant.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedRestaurant?.id === restaurant.id
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedRestaurant(restaurant)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {restaurant.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {restaurant.address}
                        </p>
                        <p className="text-sm text-gray-500">
                          Kapasite: {restaurant.capacity}
                        </p>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal("restaurants", restaurant);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete("restaurants", restaurant.id);
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {getFilteredRestaurants().length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">🍽️</div>
                    <div>Bu firmada henüz restoran yok</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Alt Panel - Restoran Detayları (Geniş Kartlar) */}
        {selectedRestaurant && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                📋 {selectedRestaurant.name} - Detay Yönetimi
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                {/* Müşteriler Kartı */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="text-2xl">👥</div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Müşteriler
                        </h3>
                        <p className="text-sm text-gray-600">
                          {getFilteredData("customers").length} kayıt
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => openModal("customers")}
                      className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 text-sm"
                    >
                      + Ekle
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {getFilteredData("customers")
                      .slice(0, 5)
                      .map((customer: any) => (
                        <div
                          key={customer.id}
                          className="bg-white rounded p-3 flex justify-between items-center shadow-sm"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {customer.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {customer.email}
                            </div>
                            <div className="flex items-center space-x-3 mt-1">
                              <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                📊 {customer.reservationCount || 0} rezervasyon
                              </div>
                              <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                ⭐ {customer.loyaltyPoints || 0} puan
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => openModal("customers", customer)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() =>
                                handleDelete("customers", customer.id)
                              }
                              className="text-red-600 hover:text-red-800"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    {getFilteredData("customers").length > 5 && (
                      <div className="text-center text-sm text-gray-500 py-2">
                        +{getFilteredData("customers").length - 5} daha...
                      </div>
                    )}
                  </div>
                </div>

                {/* Kategoriler Kartı */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="text-2xl">📂</div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Kategoriler
                        </h3>
                        <p className="text-sm text-gray-600">
                          {getFilteredData("categories").length} kayıt
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => openModal("categories")}
                      className="bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700 text-sm"
                    >
                      + Ekle
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {getFilteredData("categories").map((category: any) => (
                      <div
                        key={category.id}
                        className="bg-white rounded p-3 flex justify-between items-center shadow-sm"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: category.color }}
                          ></div>
                          <div className="font-medium text-sm">
                            {category.name}
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => openModal("categories", category)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() =>
                              handleDelete("categories", category.id)
                            }
                            className="text-red-600 hover:text-red-800"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Masalar Kartı */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="text-2xl">🪑</div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Masalar</h3>
                        <p className="text-sm text-gray-600">
                          {getFilteredData("tables").length} kayıt
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => openModal("tables")}
                      className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 text-sm"
                    >
                      + Ekle
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {getFilteredData("tables").map((table: any) => (
                      <div
                        key={table.id}
                        className="bg-white rounded p-3 flex justify-between items-center shadow-sm"
                      >
                        <div>
                          <div className="font-medium text-sm">
                            Masa {table.number}
                          </div>
                          <div className="text-xs text-gray-500">
                            Kapasite: {table.capacity}
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => openModal("tables", table)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete("tables", table.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Garsonlar Kartı */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="text-2xl">👨‍💼</div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Garsonlar
                        </h3>
                        <p className="text-sm text-gray-600">
                          {getFilteredData("waiters").length} kayıt
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => openModal("waiters")}
                      className="bg-orange-600 text-white px-3 py-1 rounded-lg hover:bg-orange-700 text-sm"
                    >
                      + Ekle
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {getFilteredData("waiters").map((waiter: any) => (
                      <div
                        key={waiter.id}
                        className="bg-white rounded p-3 flex justify-between items-center shadow-sm"
                      >
                        <div>
                          <div className="font-medium text-sm">
                            {waiter.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {waiter.phone}
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => openModal("waiters", waiter)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete("waiters", waiter.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!selectedRestaurant && selectedCompany && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">🍽️</div>
            <div className="text-xl font-medium text-gray-900 mb-2">
              Restoran Seçin
            </div>
            <div className="text-gray-600">
              {selectedCompany.name} firmasından bir restoran seçin ve
              detaylarını yönetin
            </div>
          </div>
        )}

        {!selectedCompany && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">🏢</div>
            <div className="text-xl font-medium text-gray-900 mb-2">
              Hoş Geldiniz
            </div>
            <div className="text-gray-600">
              Başlamak için yukarıdan bir firma seçin
            </div>
          </div>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  {editingItem ? "✏️ Düzenle" : "➕ Yeni Ekle"} - {modalType}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="İsim"
                  value={formData.name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg"
                />

                {modalType !== "categories" && (
                  <>
                    <input
                      type="email"
                      placeholder="Email"
                      value={formData.email || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="tel"
                      placeholder="Telefon"
                      value={formData.phone || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Adres"
                      value={formData.address || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    />
                  </>
                )}

                {modalType === "restaurants" && (
                  <input
                    type="number"
                    placeholder="Kapasite"
                    value={formData.capacity || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        capacity: parseInt(e.target.value),
                      })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                )}

                {modalType === "tables" && (
                  <>
                    <input
                      type="number"
                      placeholder="Masa Numarası"
                      value={formData.number || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          number: parseInt(e.target.value),
                        })
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="number"
                      placeholder="Kapasite"
                      value={formData.capacity || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          capacity: parseInt(e.target.value),
                        })
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    />
                    <select
                      value={formData.category_id || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          category_id: e.target.value,
                        })
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    >
                      <option value="">Kategori Seçin</option>
                      {getFilteredData("categories").map((category: any) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </>
                )}

                {modalType === "categories" && (
                  <input
                    type="color"
                    value={formData.color || "#3b82f6"}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="w-full h-12 border border-gray-300 rounded-lg"
                  />
                )}

                {(modalType === "companies" ||
                  modalType === "restaurants" ||
                  modalType === "waiters") && (
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive !== false}
                      onChange={(e) =>
                        setFormData({ ...formData, isActive: e.target.checked })
                      }
                      className="rounded"
                    />
                    <span>Aktif</span>
                  </label>
                )}
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Kaydediliyor..." : "Kaydet"}
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
