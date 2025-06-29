"use client";

import { useState, useEffect } from "react";
import { useAuthContext } from "@/lib/firebase/context";
import { db } from "@/lib/firebase/config";
import { ref, push, get, update, set } from "firebase/database";
import { X, Plus, Edit2, Save, Trash2, User, Phone, Mail } from "lucide-react";
import toast from "react-hot-toast";

interface WaiterManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Waiter {
  id: string;
  name: string;
  position: "waiter" | "busboy";
  restaurantId: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface WaiterForm {
  name: string;
  position: "waiter" | "busboy";
  phone: string;
  email: string;
}

export default function WaiterManagementModal({
  isOpen,
  onClose,
}: WaiterManagementModalProps) {
  const { selectedRestaurant } = useAuthContext();
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [editingWaiter, setEditingWaiter] = useState<Waiter | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<WaiterForm>({
    name: "",
    position: "waiter",
    phone: "",
    email: "",
  });

  // Personeli yükle
  useEffect(() => {
    if (isOpen && selectedRestaurant) {
      loadWaiters();
    }
  }, [isOpen, selectedRestaurant]);

  const loadWaiters = async () => {
    if (!selectedRestaurant) return;

    setLoading(true);
    try {
      const waitersRef = ref(db, "waiters");
      const snapshot = await get(waitersRef);

      if (snapshot.exists()) {
        const waitersData = snapshot.val();
        const restaurantWaiters = Object.entries(waitersData)
          .filter(
            ([_, waiter]: [string, any]) =>
              waiter.restaurantId === selectedRestaurant.id
          )
          .map(([id, waiter]: [string, any]) => ({
            id,
            ...waiter,
          })) as Waiter[];

        setWaiters(restaurantWaiters);
      } else {
        setWaiters([]);
      }
    } catch (error) {
      console.error("Personel yükleme hatası:", error);
      toast.error("Personel listesi yüklenemedi");
    }
    setLoading(false);
  };

  // Form reset
  const resetForm = () => {
    setFormData({
      name: "",
      position: "waiter",
      phone: "",
      email: "",
    });
    setEditingWaiter(null);
    setShowAddForm(false);
  };

  // Yeni personel ekleme
  const handleAddWaiter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurant || !formData.name.trim()) {
      toast.error("Ad alanı zorunludur");
      return;
    }

    setLoading(true);
    try {
      const waitersRef = ref(db, "waiters");
      const newWaiter = {
        name: formData.name.trim(),
        position: formData.position,
        restaurantId: selectedRestaurant.id,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await push(waitersRef, newWaiter);
      toast.success("Personel başarıyla eklendi");
      resetForm();
      loadWaiters();
    } catch (error) {
      console.error("Personel ekleme hatası:", error);
      toast.error("Personel eklenemedi");
    }
    setLoading(false);
  };

  // Personel düzenleme başlat
  const startEdit = (waiter: Waiter) => {
    setEditingWaiter(waiter);
    setFormData({
      name: waiter.name,
      position: waiter.position,
      phone: waiter.phone || "",
      email: waiter.email || "",
    });
    setShowAddForm(true);
  };

  // Personel güncelleme
  const handleUpdateWaiter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWaiter || !formData.name.trim()) {
      toast.error("Ad alanı zorunludur");
      return;
    }

    setLoading(true);
    try {
      const waiterRef = ref(db, `waiters/${editingWaiter.id}`);
      const updatedWaiter = {
        name: formData.name.trim(),
        position: formData.position,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        updatedAt: new Date().toISOString(),
      };

      await update(waiterRef, updatedWaiter);
      toast.success("Personel başarıyla güncellendi");
      resetForm();
      loadWaiters();
    } catch (error) {
      console.error("Personel güncelleme hatası:", error);
      toast.error("Personel güncellenemedi");
    }
    setLoading(false);
  };

  // Personel silme (deaktive etme)
  const handleDeleteWaiter = async (waiterId: string) => {
    if (!confirm("Bu personeli silmek istediğinizden emin misiniz?")) {
      return;
    }

    setLoading(true);
    try {
      const waiterRef = ref(db, `waiters/${waiterId}`);
      await update(waiterRef, {
        isActive: false,
        updatedAt: new Date().toISOString(),
      });

      toast.success("Personel başarıyla silindi");
      loadWaiters();
    } catch (error) {
      console.error("Personel silme hatası:", error);
      toast.error("Personel silinemedi");
    }
    setLoading(false);
  };

  // Form değişiklikleri
  const handleInputChange = (field: keyof WaiterForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <User className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Personel Yönetimi
              </h2>
              <p className="text-sm text-gray-600">
                {selectedRestaurant?.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add Button */}
        <div className="p-6 border-b">
          <button
            onClick={() => setShowAddForm(true)}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Personel Ekle</span>
          </button>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="p-6 border-b bg-gray-50">
            <h3 className="text-lg font-semibold mb-4">
              {editingWaiter ? "Personel Düzenle" : "Yeni Personel Ekle"}
            </h3>

            <form
              onSubmit={editingWaiter ? handleUpdateWaiter : handleAddWaiter}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* İsim */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    İsim *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Personel adı"
                    required
                  />
                </div>

                {/* Pozisyon */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pozisyon *
                  </label>
                  <select
                    value={formData.position}
                    onChange={(e) =>
                      handleInputChange(
                        "position",
                        e.target.value as "waiter" | "busboy"
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="waiter">👨‍💼 Garson</option>
                    <option value="busboy">🧑‍🍳 Komi</option>
                  </select>
                </div>

                {/* Telefon */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0555 123 45 67"
                  />
                </div>

                {/* E-posta */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="w-4 h-4 inline mr-1" />
                    E-posta
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="personel@restaurant.com"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.name.trim()}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingWaiter ? "Güncelle" : "Kaydet"}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Waiters List */}
        <div className="p-6 max-h-[50vh] overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Yükleniyor...</p>
            </div>
          ) : waiters.length === 0 ? (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Henüz personel eklenmemiş</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Garsonlar */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">
                  👨‍💼 Garsonlar (
                  {waiters.filter((w) => w.position === "waiter").length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {waiters
                    .filter((w) => w.position === "waiter")
                    .map((waiter) => (
                      <div
                        key={waiter.id}
                        className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium text-blue-900">
                              {waiter.name}
                            </h5>
                            {waiter.phone && (
                              <p className="text-sm text-blue-700 flex items-center mt-1">
                                <Phone className="w-3 h-3 mr-1" />
                                {waiter.phone}
                              </p>
                            )}
                            {waiter.email && (
                              <p className="text-sm text-blue-700 flex items-center mt-1">
                                <Mail className="w-3 h-3 mr-1" />
                                {waiter.email}
                              </p>
                            )}
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <button
                              onClick={() => startEdit(waiter)}
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteWaiter(waiter.id)}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Komisler */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">
                  🧑‍🍳 Komisler (
                  {waiters.filter((w) => w.position === "busboy").length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {waiters
                    .filter((w) => w.position === "busboy")
                    .map((waiter) => (
                      <div
                        key={waiter.id}
                        className="bg-orange-50 border border-orange-200 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium text-orange-900">
                              {waiter.name}
                            </h5>
                            {waiter.phone && (
                              <p className="text-sm text-orange-700 flex items-center mt-1">
                                <Phone className="w-3 h-3 mr-1" />
                                {waiter.phone}
                              </p>
                            )}
                            {waiter.email && (
                              <p className="text-sm text-orange-700 flex items-center mt-1">
                                <Mail className="w-3 h-3 mr-1" />
                                {waiter.email}
                              </p>
                            )}
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <button
                              onClick={() => startEdit(waiter)}
                              className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteWaiter(waiter.id)}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Toplam: {waiters.length} personel
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
