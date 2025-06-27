"use client";

import { useState, useEffect } from "react";
import { useAuthContext } from "@/lib/firebase/context";
import { db } from "@/lib/firebase/config";
import { ref, get, set, push, remove, update } from "firebase/database";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  Users,
  Building,
  Coffee,
  Grid3X3,
  UserCheck,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Settings,
  ArrowLeft,
} from "lucide-react";

export default function ComprehensiveSettingsPage() {
  const {
    user,
    company: currentCompany,
    selectedRestaurant,
  } = useAuthContext();

  // Active tab state
  const [activeTab, setActiveTab] = useState("customers");

  // Data states
  const [customers, setCustomers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [waiters, setWaiters] = useState<any[]>([]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [modalType, setModalType] = useState<string>("");

  // Form state
  const [formData, setFormData] = useState<any>({});

  // Loading state
  const [loading, setLoading] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCustomers(),
        loadCompanies(),
        loadRestaurants(),
        loadCategories(),
        loadTables(),
        loadWaiters(),
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Veriler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  // Load functions
  const loadCustomers = async () => {
    try {
      const snapshot = await get(ref(db, "customers"));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const customersList = Object.entries(data).map(
          ([id, customer]: [string, any]) => ({
            id,
            ...customer,
          })
        );
        setCustomers(customersList);
      }
    } catch (error) {
      console.error("Error loading customers:", error);
    }
  };

  const loadCompanies = async () => {
    try {
      const snapshot = await get(ref(db, "companies"));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const companiesList = Object.entries(data).map(
          ([id, company]: [string, any]) => ({
            id,
            ...company,
          })
        );
        setCompanies(companiesList);
      }
    } catch (error) {
      console.error("Error loading companies:", error);
    }
  };

  const loadRestaurants = async () => {
    try {
      const snapshot = await get(ref(db, "restaurants"));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const restaurantsList = Object.entries(data).map(
          ([id, restaurant]: [string, any]) => ({
            id,
            ...restaurant,
          })
        );
        setRestaurants(restaurantsList);
      }
    } catch (error) {
      console.error("Error loading restaurants:", error);
    }
  };

  const loadCategories = async () => {
    try {
      const snapshot = await get(ref(db, "categories"));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const categoriesList = Object.entries(data).map(
          ([id, category]: [string, any]) => ({
            id,
            ...category,
          })
        );
        setCategories(categoriesList);
      }
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const loadTables = async () => {
    try {
      const snapshot = await get(ref(db, "tables"));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const tablesList = Object.entries(data).map(
          ([id, table]: [string, any]) => ({
            id,
            ...table,
          })
        );
        setTables(tablesList);
      }
    } catch (error) {
      console.error("Error loading tables:", error);
    }
  };

  const loadWaiters = async () => {
    try {
      const snapshot = await get(ref(db, "waiters"));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const waitersList = Object.entries(data).map(
          ([id, waiter]: [string, any]) => ({
            id,
            ...waiter,
          })
        );
        setWaiters(waitersList);
      }
    } catch (error) {
      console.error("Error loading waiters:", error);
    }
  };

  // Modal functions
  const openModal = (type: string, item?: any) => {
    setModalType(type);
    setEditingItem(item);
    setFormData(item || getDefaultFormData(type));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({});
  };

  const getDefaultFormData = (type: string) => {
    const defaults: Record<string, any> = {
      customer: { name: "", email: "", phone: "", address: "", notes: "" },
      company: { name: "", email: "", phone: "", address: "", isActive: true },
      restaurant: {
        name: "",
        companyId: currentCompany?.id || "",
        address: "",
        phone: "",
        email: "",
        capacity: 50,
        isActive: true,
      },
      category: {
        name: "",
        color: "#3b82f6",
        restaurantId: selectedRestaurant?.id || "",
      },
      table: {
        number: 1,
        capacity: 4,
        category_id: "",
        restaurantId: selectedRestaurant?.id || "",
        status: "active",
      },
      waiter: {
        name: "",
        email: "",
        phone: "",
        restaurantId: selectedRestaurant?.id || "",
        isActive: true,
      },
    };
    return defaults[type] || {};
  };

  // CRUD operations
  const handleSave = async () => {
    try {
      setLoading(true);

      if (editingItem) {
        // Update
        await update(ref(db, `${modalType}s/${editingItem.id}`), {
          ...formData,
          updatedAt: new Date().toISOString(),
        });
        toast.success(`${getEntityName(modalType)} güncellendi!`);
      } else {
        // Create
        const newRef = push(ref(db, `${modalType}s`));
        await set(newRef, {
          ...formData,
          createdAt: new Date().toISOString(),
        });
        toast.success(`${getEntityName(modalType)} eklendi!`);
      }

      closeModal();
      loadAllData();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Kaydetme hatası!");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (type: string, id: string) => {
    if (
      !confirm(
        `Bu ${getEntityName(
          type
        ).toLowerCase()}ı silmek istediğinizden emin misiniz?`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      await remove(ref(db, `${type}s/${id}`));
      toast.success(`${getEntityName(type)} silindi!`);
      loadAllData();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Silme hatası!");
    } finally {
      setLoading(false);
    }
  };

  const getEntityName = (type: string) => {
    const names: Record<string, string> = {
      customer: "Müşteri",
      company: "Firma",
      restaurant: "Restoran",
      category: "Kategori",
      table: "Masa",
      waiter: "Garson",
    };
    return names[type] || type;
  };

  // Tab configuration
  const tabs = [
    { id: "customers", name: "Müşteriler", icon: Users, data: customers },
    { id: "companies", name: "Firmalar", icon: Building, data: companies },
    { id: "restaurants", name: "Restoranlar", icon: Coffee, data: restaurants },
    { id: "categories", name: "Kategoriler", icon: Grid3X3, data: categories },
    { id: "tables", name: "Masalar", icon: Settings, data: tables },
    { id: "waiters", name: "Garsonlar", icon: UserCheck, data: waiters },
  ];

  const getCurrentData = () => {
    switch (activeTab) {
      case "customers":
        return customers;
      case "companies":
        return companies;
      case "restaurants":
        return restaurants;
      case "categories":
        return categories;
      case "tables":
        return tables;
      case "waiters":
        return waiters;
      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              🔧 Gelişmiş Sistem Yönetimi
            </h1>
            <p className="text-gray-600 mt-2">
              Tüm varlıkları yönetin - CRUD işlemleri
            </p>
          </div>
          <Link
            href="/admin/settings"
            className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Geri Dön</span>
          </Link>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.name}</span>
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                      {tab.data.length}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {tabs.find((t) => t.id === activeTab)?.name}
              </h2>
              <button
                onClick={() => openModal(activeTab)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                <span>Yeni Ekle</span>
              </button>
            </div>

            {/* Simple Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      İsim
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Detaylar
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {getCurrentData().map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.name || item.number || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.email ||
                          item.phone ||
                          item.address ||
                          item.capacity ||
                          item.color ||
                          "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => openModal(activeTab, item)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(activeTab, item.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {getCurrentData().length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Henüz veri yok. Yeni eklemek için "Yeni Ekle" butonunu
                  kullanın.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  {editingItem ? "Düzenle" : "Yeni Ekle"} -{" "}
                  {getEntityName(modalType)}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Dynamic Form */}
              <div className="space-y-4">
                {modalType === "customer" && (
                  <>
                    <input
                      type="text"
                      placeholder="İsim *"
                      value={formData.name || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      required
                    />
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
                    <textarea
                      placeholder="Notlar"
                      value={formData.notes || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      rows={3}
                    />
                  </>
                )}

                {modalType === "company" && (
                  <>
                    <input
                      type="text"
                      placeholder="Firma Adı *"
                      value={formData.name || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      required
                    />
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
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.isActive !== false}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isActive: e.target.checked,
                          })
                        }
                        className="rounded"
                      />
                      <span>Aktif</span>
                    </label>
                  </>
                )}

                {modalType === "restaurant" && (
                  <>
                    <input
                      type="text"
                      placeholder="Restoran Adı *"
                      value={formData.name || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      required
                    />
                    <select
                      value={formData.companyId || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, companyId: e.target.value })
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    >
                      <option value="">Firma Seçin</option>
                      {companies.map((company: any) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Adres"
                      value={formData.address || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
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
                      type="email"
                      placeholder="Email"
                      value={formData.email || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
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
                          capacity: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    />
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.isActive !== false}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isActive: e.target.checked,
                          })
                        }
                        className="rounded"
                      />
                      <span>Aktif</span>
                    </label>
                  </>
                )}

                {modalType === "category" && (
                  <>
                    <input
                      type="text"
                      placeholder="Kategori Adı *"
                      value={formData.name || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      required
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Renk
                      </label>
                      <input
                        type="color"
                        value={formData.color || "#3b82f6"}
                        onChange={(e) =>
                          setFormData({ ...formData, color: e.target.value })
                        }
                        className="w-full h-12 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <select
                      value={formData.restaurantId || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          restaurantId: e.target.value,
                        })
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    >
                      <option value="">Tüm Restoranlar</option>
                      {restaurants.map((restaurant: any) => (
                        <option key={restaurant.id} value={restaurant.id}>
                          {restaurant.name}
                        </option>
                      ))}
                    </select>
                  </>
                )}

                {modalType === "table" && (
                  <>
                    <input
                      type="number"
                      placeholder="Masa Numarası *"
                      value={formData.number || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          number: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Kapasite *"
                      value={formData.capacity || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          capacity: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      required
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
                      required
                    >
                      <option value="">Kategori Seçin</option>
                      {categories.map((category: any) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={formData.restaurantId || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          restaurantId: e.target.value,
                        })
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      required
                    >
                      <option value="">Restoran Seçin</option>
                      {restaurants.map((restaurant: any) => (
                        <option key={restaurant.id} value={restaurant.id}>
                          {restaurant.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={formData.status || "active"}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    >
                      <option value="active">Aktif</option>
                      <option value="inactive">Pasif</option>
                    </select>
                  </>
                )}

                {modalType === "waiter" && (
                  <>
                    <input
                      type="text"
                      placeholder="İsim *"
                      value={formData.name || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      required
                    />
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
                    <select
                      value={formData.restaurantId || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          restaurantId: e.target.value,
                        })
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      required
                    >
                      <option value="">Restoran Seçin</option>
                      {restaurants.map((restaurant: any) => (
                        <option key={restaurant.id} value={restaurant.id}>
                          {restaurant.name}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.isActive !== false}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isActive: e.target.checked,
                          })
                        }
                        className="rounded"
                      />
                      <span>Aktif</span>
                    </label>
                  </>
                )}
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? "Kaydediliyor..." : "Kaydet"}</span>
                </button>
                <button
                  onClick={closeModal}
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
