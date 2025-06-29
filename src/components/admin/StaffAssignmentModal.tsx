"use client";

import { useState, useEffect } from "react";
import { useAuthContext } from "@/lib/firebase/context";
import { db } from "@/lib/firebase/config";
import { ref, get, set, update } from "firebase/database";
import { X, Calendar, Users, Clock, Save, Trash2, Info } from "lucide-react";
import toast from "react-hot-toast";

interface StaffAssignmentModalProps {
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
}

interface Table {
  id: string;
  number: number;
  capacity: number;
  categoryId: string;
  restaurantId: string;
  status: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
}

interface Assignment {
  waiterId?: string;
  buserId?: string;
  shift: "morning" | "evening" | "all_day";
  assignedAt?: string;
}

export default function StaffAssignmentModal({
  isOpen,
  onClose,
}: StaffAssignmentModalProps) {
  const { selectedRestaurant } = useAuthContext();
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedShift, setSelectedShift] = useState<
    "morning" | "evening" | "all_day"
  >("all_day");
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [assignments, setAssignments] = useState<Record<string, Assignment>>(
    {}
  );
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Verileri yükle
  useEffect(() => {
    if (isOpen && selectedRestaurant) {
      loadData();
    }
  }, [isOpen, selectedRestaurant, startDate, endDate]);

  const loadData = async () => {
    if (!selectedRestaurant) return;

    setLoading(true);
    try {
      // Garsonları yükle
      const waitersRef = ref(db, "waiters");
      const waitersSnapshot = await get(waitersRef);
      if (waitersSnapshot.exists()) {
        const waitersData = waitersSnapshot.val();
        console.log("🔧 All waiters from Firebase:", waitersData);

        const restaurantWaiters = Object.entries(waitersData)
          .filter(([_, waiter]: [string, any]) => {
            console.log(
              "🔧 Checking waiter:",
              waiter,
              "for restaurant:",
              selectedRestaurant.id
            );
            return (
              waiter.restaurantId === selectedRestaurant.id &&
              waiter.isActive !== false
            );
          })
          .map(([id, waiter]: [string, any]) => ({
            id,
            ...waiter,
          })) as Waiter[];

        console.log("🔧 Restaurant waiters loaded:", restaurantWaiters);
        console.log(
          "🔧 Waiter positions:",
          restaurantWaiters.map((w) => ({ name: w.name, position: w.position }))
        );
        setWaiters(restaurantWaiters);
      } else {
        console.log("❌ No waiters found in Firebase");
        setWaiters([]);
      }

      // Masaları yükle
      const tablesRef = ref(db, "tables");
      const tablesSnapshot = await get(tablesRef);
      if (tablesSnapshot.exists()) {
        const tablesData = tablesSnapshot.val();
        console.log("🔧 All tables from Firebase:", tablesData);

        const restaurantTables = Object.entries(tablesData)
          .filter(
            ([_, table]: [string, any]) =>
              table.restaurantId === selectedRestaurant.id
          )
          .map(([id, table]: [string, any]) => {
            // Kategori ID'sini farklı fieldlardan al
            let categoryId =
              table.categoryId || table.category_id || table.category;

            console.log(`🔧 Table ${id} category mapping:`, {
              tableData: table,
              categoryId: table.categoryId,
              category_id: table.category_id,
              category: table.category,
              finalCategoryId: categoryId || "uncategorized",
            });

            return {
              id,
              number: table.number || parseInt(id.replace(/\D/g, "")) || 0,
              capacity: table.capacity || 2,
              categoryId: categoryId || "uncategorized",
              restaurantId: table.restaurantId,
              status: table.status || "available",
            };
          }) as Table[];

        console.log("🔧 Restaurant tables loaded:", restaurantTables);
        console.log(
          "🔧 Table categories summary:",
          restaurantTables.reduce((acc: any, table) => {
            acc[table.categoryId] = (acc[table.categoryId] || 0) + 1;
            return acc;
          }, {})
        );

        setTables(restaurantTables);
      } else {
        console.log("❌ No tables found in Firebase");
        setTables([]);
      }

      // Kategorileri yükle - farklı Firebase path'lerini dene
      let categoriesLoaded = false;

      // 1. "categories" path'ini dene
      const categoriesRef = ref(db, "categories");
      const categoriesSnapshot = await get(categoriesRef);

      // 2. "tableCategories" path'ini dene
      const tableCategoriesRef = ref(db, "tableCategories");
      const tableCategoriesSnapshot = await get(tableCategoriesRef);

      // 3. "table_categories" path'ini dene
      const oldCategoriesRef = ref(db, "table_categories");
      const oldCategoriesSnapshot = await get(oldCategoriesRef);

      console.log("🔧 Category paths check:", {
        categories: categoriesSnapshot.exists(),
        tableCategories: tableCategoriesSnapshot.exists(),
        table_categories: oldCategoriesSnapshot.exists(),
      });

      let allCategoriesData = {};

      // Hangi path'de veri varsa onu kullan
      if (categoriesSnapshot.exists()) {
        allCategoriesData = categoriesSnapshot.val();
        console.log("🔧 Using 'categories' path");
      } else if (tableCategoriesSnapshot.exists()) {
        allCategoriesData = tableCategoriesSnapshot.val();
        console.log("🔧 Using 'tableCategories' path");
      } else if (oldCategoriesSnapshot.exists()) {
        allCategoriesData = oldCategoriesSnapshot.val();
        console.log("🔧 Using 'table_categories' path");
      }

      console.log("🔧 All categories from Firebase:", allCategoriesData);

      if (Object.keys(allCategoriesData).length > 0) {
        // Önce restaurant'a ait kategorileri kontrol et
        let restaurantCategories = Object.entries(allCategoriesData)
          .filter(
            ([_, category]: [string, any]) =>
              category.restaurantId === selectedRestaurant.id
          )
          .map(([id, category]: [string, any]) => ({
            id,
            name: category.name,
            color: category.color || "#6B7280",
            backgroundColor: category.backgroundColor || "#F3F4F6",
            borderColor: category.borderColor || "#D1D5DB",
          })) as Category[];

        console.log("🔧 Filtered restaurant categories:", restaurantCategories);

        // Eğer restaurant'a ait kategori yoksa, tüm kategorileri al
        if (restaurantCategories.length === 0) {
          console.log(
            "🔧 No restaurant-specific categories, using all categories"
          );
          restaurantCategories = Object.entries(allCategoriesData).map(
            ([id, category]: [string, any]) => ({
              id,
              name: category.name,
              color: category.color || "#6B7280",
              backgroundColor: category.backgroundColor || "#F3F4F6",
              borderColor: category.borderColor || "#D1D5DB",
            })
          ) as Category[];
        }

        console.log("🔧 Final categories loaded:", restaurantCategories);
        setCategories(restaurantCategories);
        categoriesLoaded = true;
      }

      // Eğer hiç kategori bulunamadıysa, fallback kategoriler oluştur
      if (!categoriesLoaded) {
        console.log("❌ No categories found, creating fallback categories");
        const fallbackCategories = [
          {
            id: "salon",
            name: "Salon",
            color: "#3B82F6",
            backgroundColor: "#DBEAFE",
            borderColor: "#1D4ED8",
          },
          {
            id: "grill",
            name: "Grill",
            color: "#EF4444",
            backgroundColor: "#FEE2E2",
            borderColor: "#DC2626",
          },
          {
            id: "terrace",
            name: "Terrace",
            color: "#10B981",
            backgroundColor: "#D1FAE5",
            borderColor: "#047857",
          },
          {
            id: "bahce",
            name: "Bahçe",
            color: "#F59E0B",
            backgroundColor: "#FEF3C7",
            borderColor: "#D97706",
          },
        ];
        setCategories(fallbackCategories);
      }

      // Mevcut atamaları yükle (sadece başlangıç tarihi için önizleme)
      const assignmentsRef = ref(
        db,
        `assignments/${selectedRestaurant.id}/${startDate}`
      );
      const assignmentsSnapshot = await get(assignmentsRef);
      if (assignmentsSnapshot.exists()) {
        setAssignments(assignmentsSnapshot.val());
        console.log(
          "🔧 Loaded assignments for preview:",
          assignmentsSnapshot.val()
        );
      } else {
        setAssignments({});
        console.log("🔧 No assignments found for date:", startDate);
      }
    } catch (error) {
      console.error("Veri yükleme hatası:", error);
      toast.error("Veriler yüklenirken hata oluştu");
    }
    setLoading(false);
  };

  // Masa seçimi toggle
  const toggleTableSelection = (tableId: string) => {
    setSelectedTables((prev) =>
      prev.includes(tableId)
        ? prev.filter((id) => id !== tableId)
        : [...prev, tableId]
    );
  };

  // Tüm masaları seç
  const selectAllTables = () => {
    const allTableIds = tables.map((table) => table.id);
    setSelectedTables(allTableIds);
  };

  // Tüm seçimi temizle
  const clearAllSelection = () => {
    setSelectedTables([]);
  };

  // Kategori bazlı toplu seçim
  const toggleCategorySelection = (categoryId: string) => {
    const groupedTables = groupTablesByCategory();
    const categoryTables = groupedTables[categoryId] || [];
    const categoryTableIds = categoryTables.map((table) => table.id);

    // Bu kategorideki masalardan kaç tanesi seçili?
    const selectedInCategory = categoryTableIds.filter((id) =>
      selectedTables.includes(id)
    );

    if (selectedInCategory.length === categoryTableIds.length) {
      // Tüm kategori seçiliyse, kategorideki seçimleri kaldır
      setSelectedTables((prev) =>
        prev.filter((id) => !categoryTableIds.includes(id))
      );
    } else {
      // Kategorideki tüm masaları seç
      setSelectedTables((prev) => {
        const newSelection = [...prev];
        categoryTableIds.forEach((id) => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        return newSelection;
      });
    }
  };

  // Garson atama - tarih aralığında
  const assignWaiter = async (
    waiterId: string,
    position: "waiter" | "busboy"
  ) => {
    if (!selectedRestaurant) {
      toast.error("Restoran seçilmemiş");
      return;
    }

    if (selectedTables.length === 0) {
      toast.error("Önce masa seçin");
      return;
    }

    setLoading(true);
    try {
      const updates: Record<string, any> = {};

      // Tarih aralığındaki her gün için atama yap
      const start = new Date(startDate);
      const end = new Date(endDate);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split("T")[0];

        // Önce mevcut atamaları kontrol et
        const dateAssignmentsRef = ref(
          db,
          `assignments/${selectedRestaurant.id}/${dateStr}`
        );
        const dateAssignmentsSnapshot = await get(dateAssignmentsRef);
        const existingAssignments = dateAssignmentsSnapshot.exists()
          ? dateAssignmentsSnapshot.val()
          : {};

        selectedTables.forEach((tableId) => {
          const currentAssignment = existingAssignments[tableId] || {};
          const newAssignment = {
            ...currentAssignment, // Mevcut atamaları koru
            [position === "waiter" ? "waiterId" : "buserId"]: waiterId,
            shift: selectedShift,
            assignedAt: new Date().toISOString(),
          };

          updates[
            `assignments/${selectedRestaurant.id}/${dateStr}/${tableId}`
          ] = newAssignment;
        });
      }

      await update(ref(db), updates);

      const dayCount =
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
        1;
      toast.success(
        `${
          position === "waiter" ? "Garson" : "Komi"
        } ${dayCount} günlük atama başarılı`
      );
      setSelectedTables([]);
      loadData(); // Verileri yenile
    } catch (error) {
      console.error("Atama hatası:", error);
      toast.error("Atama başarısız");
    }
    setLoading(false);
  };

  // Atamayı kaldır
  const removeAssignment = async (
    tableId: string,
    position: "waiter" | "busboy"
  ) => {
    if (!selectedRestaurant) {
      toast.error("Restoran seçilmemiş");
      return;
    }

    setLoading(true);
    try {
      const currentAssignment = assignments[tableId] || {};
      const updatedAssignment = { ...currentAssignment };

      if (position === "waiter") {
        delete updatedAssignment.waiterId;
      } else {
        delete updatedAssignment.buserId;
      }

      if (
        Object.keys(updatedAssignment).length === 0 ||
        (!updatedAssignment.waiterId && !updatedAssignment.buserId)
      ) {
        // Atamayı tamamen sil
        await set(
          ref(
            db,
            `assignments/${selectedRestaurant.id}/${startDate}/${tableId}`
          ),
          null
        );
        setAssignments((prev) => {
          const newAssignments = { ...prev };
          delete newAssignments[tableId];
          return newAssignments;
        });
      } else {
        // Sadece pozisyonu sil
        await set(
          ref(
            db,
            `assignments/${selectedRestaurant.id}/${startDate}/${tableId}`
          ),
          updatedAssignment
        );
        setAssignments((prev) => ({
          ...prev,
          [tableId]: updatedAssignment,
        }));
      }

      toast.success(
        `${position === "waiter" ? "Garson" : "Komi"} ataması kaldırıldı`
      );
    } catch (error) {
      console.error("Atama kaldırma hatası:", error);
      toast.error("Atama kaldırılamadı");
    }
    setLoading(false);
  };

  // Vardiya değiştir
  const changeShift = async (
    tableId: string,
    newShift: "morning" | "evening" | "all_day"
  ) => {
    if (!selectedRestaurant) {
      toast.error("Restoran seçilmemiş");
      return;
    }

    setLoading(true);
    try {
      const currentAssignment = assignments[tableId] || {};
      const updatedAssignment = {
        ...currentAssignment,
        shift: newShift,
        assignedAt: new Date().toISOString(),
      };

      await set(
        ref(db, `assignments/${selectedRestaurant.id}/${startDate}/${tableId}`),
        updatedAssignment
      );

      setAssignments((prev) => ({
        ...prev,
        [tableId]: updatedAssignment,
      }));

      const shiftNames = {
        morning: "Sabah",
        evening: "Akşam",
        all_day: "Tüm Gün",
      };

      toast.success(`Vardiya ${shiftNames[newShift]} olarak değiştirildi`);
    } catch (error) {
      console.error("Vardiya değiştirme hatası:", error);
      toast.error("Vardiya değiştirilemedi");
    }
    setLoading(false);
  };

  // Kategorilere göre masaları grupla
  const groupTablesByCategory = () => {
    console.log("🔧 Grouping tables by category...");
    console.log("🔧 Tables to group:", tables);
    console.log("🔧 Available categories:", categories);

    const grouped: Record<string, Table[]> = {};

    tables.forEach((table) => {
      const categoryId = table.categoryId || "uncategorized";
      console.log(`🔧 Table ${table.number} -> category: ${categoryId}`);

      if (!grouped[categoryId]) {
        grouped[categoryId] = [];
      }
      grouped[categoryId].push(table);
    });

    console.log("🔧 Final grouped result:", grouped);
    return grouped;
  };

  // Kategori adı getir
  const getCategoryName = (categoryId: string) => {
    if (categoryId === "uncategorized") return "Kategorisiz";
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || "Bilinmeyen Kategori";
  };

  // Kategori rengi getir
  const getCategoryColor = (categoryId: string) => {
    if (categoryId === "uncategorized") return "#6B7280";
    const category = categories.find((c) => c.id === categoryId);
    return category?.color || "#6B7280";
  };

  // Garson adı getir
  const getWaiterName = (waiterId: string) => {
    const waiter = waiters.find((w) => w.id === waiterId);
    return waiter?.name || "Bilinmeyen";
  };

  // Garsonun atanmış masalarını getir
  const getWaiterAssignedTables = (
    waiterId: string,
    position: "waiter" | "busboy"
  ) => {
    const assignedTables: string[] = [];

    Object.entries(assignments).forEach(([tableId, assignment]) => {
      if (position === "waiter" && assignment.waiterId === waiterId) {
        const table = tables.find((t) => t.id === tableId);
        if (table) {
          assignedTables.push(`Masa ${table.number}`);
        }
      } else if (position === "busboy" && assignment.buserId === waiterId) {
        const table = tables.find((t) => t.id === tableId);
        if (table) {
          assignedTables.push(`Masa ${table.number}`);
        }
      }
    });

    return assignedTables;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Users className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Garson Ataması
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

        {/* Controls */}
        <div className="p-6 border-b bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Başlangıç Tarihi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Başlangıç Tarihi
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Bitiş Tarihi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Bitiş Tarihi
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Vardiya Seçimi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Vardiya
              </label>
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="morning">Sabah</option>
                <option value="evening">Akşam</option>
                <option value="all_day">Tüm Gün</option>
              </select>
            </div>

            {/* Seçilen Masalar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seçilen Masalar
              </label>
              <div className="px-3 py-2 border border-gray-300 rounded-md bg-white min-h-[40px] flex items-center">
                {selectedTables.length === 0 ? (
                  <span className="text-gray-500 text-sm">Masa seçilmedi</span>
                ) : (
                  <span className="text-sm font-medium">
                    {selectedTables.length} masa seçildi
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tarih Aralığı Bilgisi */}
          {startDate && endDate && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center space-x-2 text-sm text-blue-700">
                <Info className="w-4 h-4" />
                <span>
                  {startDate === endDate
                    ? `Tek gün: ${new Date(startDate).toLocaleDateString(
                        "tr-TR"
                      )}`
                    : `${
                        Math.ceil(
                          (new Date(endDate).getTime() -
                            new Date(startDate).getTime()) /
                            (1000 * 60 * 60 * 24)
                        ) + 1
                      } günlük atama: ${new Date(startDate).toLocaleDateString(
                        "tr-TR"
                      )} - ${new Date(endDate).toLocaleDateString("tr-TR")}`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex h-[60vh]">
          {/* Garsonlar */}
          <div className="w-1/3 p-6 border-r overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Personel</h3>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Yükleniyor...</p>
              </div>
            ) : waiters.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Personel bulunamadı</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Debug bilgileri console'da gösterilecek */}
                {(() => {
                  console.log("🔧 All waiters for rendering:", waiters);
                  console.log(
                    "🔧 Waiters filtered as waiters:",
                    waiters.filter((w) => w.position === "waiter")
                  );
                  console.log(
                    "🔧 Waiters filtered as busboys:",
                    waiters.filter((w) => w.position === "busboy")
                  );
                  return null;
                })()}

                {/* Garsonlar */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    👨‍💼 Garsonlar (
                    {waiters.filter((w) => w.position === "waiter").length})
                  </h4>
                  {waiters
                    .filter((w) => w.position === "waiter")
                    .map((waiter) => {
                      const assignedTables = getWaiterAssignedTables(
                        waiter.id,
                        "waiter"
                      );
                      return (
                        <div key={waiter.id} className="mb-2">
                          <button
                            onClick={() => assignWaiter(waiter.id, "waiter")}
                            disabled={loading || selectedTables.length === 0}
                            className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 disabled:bg-gray-100 disabled:cursor-not-allowed border border-blue-200 rounded-lg transition-colors"
                          >
                            <div className="font-medium text-blue-900">
                              {waiter.name}
                            </div>
                            {waiter.phone && (
                              <div className="text-xs text-blue-600">
                                {waiter.phone}
                              </div>
                            )}
                            {assignedTables.length > 0 && (
                              <div className="text-xs text-blue-700 mt-1 font-medium">
                                🍽️ {assignedTables.join(", ")}
                              </div>
                            )}
                          </button>
                        </div>
                      );
                    })}
                </div>

                {/* Komiler */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    🧑‍🍳 Komiler (
                    {waiters.filter((w) => w.position === "busboy").length})
                  </h4>
                  {waiters.filter((w) => w.position === "busboy").length ===
                  0 ? (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      Komi bulunamadı. <br />
                      Settings'den komi ekleyebilirsiniz.
                    </div>
                  ) : (
                    waiters
                      .filter((w) => w.position === "busboy")
                      .map((waiter) => {
                        const assignedTables = getWaiterAssignedTables(
                          waiter.id,
                          "busboy"
                        );
                        return (
                          <div key={waiter.id} className="mb-2">
                            <button
                              onClick={() => assignWaiter(waiter.id, "busboy")}
                              disabled={loading || selectedTables.length === 0}
                              className="w-full text-left p-3 bg-orange-50 hover:bg-orange-100 disabled:bg-gray-100 disabled:cursor-not-allowed border border-orange-200 rounded-lg transition-colors"
                            >
                              <div className="font-medium text-orange-900">
                                {waiter.name}
                              </div>
                              {waiter.phone && (
                                <div className="text-xs text-orange-600">
                                  {waiter.phone}
                                </div>
                              )}
                              {assignedTables.length > 0 && (
                                <div className="text-xs text-orange-700 mt-1 font-medium">
                                  🍽️ {assignedTables.join(", ")}
                                </div>
                              )}
                            </button>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Masalar */}
          <div className="flex-1 flex flex-col">
            {/* Sticky Header - Seçim Bilgileri */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h3 className="text-lg font-semibold">Masalar</h3>

                  {/* Seçim Durumu */}
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-full">
                      <span className="font-medium text-blue-900">
                        {selectedTables.length > 0
                          ? `${selectedTables.length} masa seçildi`
                          : "Masa seçilmedi"}
                      </span>
                    </div>

                    {tables.length > 0 && (
                      <div className="text-gray-500">
                        / {tables.length} toplam masa
                      </div>
                    )}
                  </div>
                </div>

                {/* Toplu Seçim Butonları */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={selectAllTables}
                    disabled={loading || tables.length === 0}
                    className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Tümünü Seç ({tables.length})
                  </button>
                  <button
                    onClick={clearAllSelection}
                    disabled={loading || selectedTables.length === 0}
                    className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Seçimi Temizle
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 p-4 overflow-y-auto">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Yükleniyor...</p>
                </div>
              ) : tables.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🍽️</div>
                  <p className="text-gray-500">Bu restoranda masa bulunamadı</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupTablesByCategory()).map(
                    ([categoryId, categoryTables]) => {
                      const categoryTableIds = categoryTables.map(
                        (table) => table.id
                      );
                      const selectedInCategory = categoryTableIds.filter((id) =>
                        selectedTables.includes(id)
                      );
                      const isAllCategorySelected =
                        selectedInCategory.length === categoryTableIds.length;
                      const isPartiallySelected =
                        selectedInCategory.length > 0 &&
                        selectedInCategory.length < categoryTableIds.length;

                      return (
                        <div key={categoryId}>
                          <div className="flex items-center justify-between mb-3 pb-2 border-b">
                            <h4
                              className="text-sm font-medium"
                              style={{ color: getCategoryColor(categoryId) }}
                            >
                              {getCategoryName(categoryId)} (
                              {categoryTables.length})
                            </h4>

                            {/* Kategori Toplu Seçim Butonu */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCategorySelection(categoryId);
                              }}
                              disabled={loading}
                              className={`px-2 py-1 text-xs rounded transition-colors ${
                                isAllCategorySelected
                                  ? "bg-green-500 text-white hover:bg-green-600"
                                  : isPartiallySelected
                                  ? "bg-yellow-500 text-white hover:bg-yellow-600"
                                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {isAllCategorySelected
                                ? `✓ Seçildi (${selectedInCategory.length})`
                                : isPartiallySelected
                                ? `⚬ Kısmi (${selectedInCategory.length}/${categoryTableIds.length})`
                                : `○ Seç (${categoryTableIds.length})`}
                            </button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {categoryTables.map((table) => {
                              const assignment = assignments[table.id];
                              const isSelected = selectedTables.includes(
                                table.id
                              );

                              return (
                                <div
                                  key={table.id}
                                  className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                    isSelected
                                      ? "border-blue-500 bg-blue-50"
                                      : "border-gray-200 hover:border-gray-300"
                                  }`}
                                  onClick={() => toggleTableSelection(table.id)}
                                >
                                  {/* Masa Numarası */}
                                  <div className="text-center mb-2">
                                    <div className="text-lg font-bold">
                                      Masa {table.number}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {table.capacity} kişi
                                    </div>
                                  </div>

                                  {/* Atamalar */}
                                  {assignment && (
                                    <div className="space-y-1">
                                      {assignment.waiterId && (
                                        <div className="flex items-center justify-between text-xs bg-blue-100 px-2 py-1 rounded">
                                          <span>
                                            👨‍💼{" "}
                                            {getWaiterName(assignment.waiterId)}
                                          </span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              removeAssignment(
                                                table.id,
                                                "waiter"
                                              );
                                            }}
                                            className="text-red-500 hover:text-red-700"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      )}
                                      {assignment.buserId && (
                                        <div className="flex items-center justify-between text-xs bg-orange-100 px-2 py-1 rounded">
                                          <span>
                                            🧑‍🍳{" "}
                                            {getWaiterName(assignment.buserId)}
                                          </span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              removeAssignment(
                                                table.id,
                                                "busboy"
                                              );
                                            }}
                                            className="text-red-500 hover:text-red-700"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      )}
                                      {assignment.shift && (
                                        <div className="text-xs text-center">
                                          <select
                                            value={assignment.shift}
                                            onChange={(e) => {
                                              e.stopPropagation();
                                              changeShift(
                                                table.id,
                                                e.target.value as
                                                  | "morning"
                                                  | "evening"
                                                  | "all_day"
                                              );
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-xs bg-gray-100 border border-gray-300 rounded px-1 py-0.5 cursor-pointer hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                          >
                                            <option value="morning">
                                              Sabah
                                            </option>
                                            <option value="evening">
                                              Akşam
                                            </option>
                                            <option value="all_day">
                                              Tüm Gün
                                            </option>
                                          </select>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Seçim İndikatörü */}
                                  {isSelected && (
                                    <div className="absolute top-2 right-2">
                                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                        <div className="w-2 h-2 bg-white rounded-full"></div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {selectedTables.length > 0 && (
                <span>{selectedTables.length} masa seçildi</span>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
