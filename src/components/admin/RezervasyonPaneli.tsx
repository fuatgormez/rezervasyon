"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  format,
  addDays,
  subDays,
  parse,
  isWithinInterval,
  addMinutes,
} from "date-fns";
import { tr } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import Link from "next/link";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Settings,
  Users,
  Coffee,
  LogOut,
  Search,
  RefreshCw,
  MoreVertical,
  PlusCircle,
  Edit,
  Trash,
  Clock,
  Filter,
  X,
  Info,
} from "lucide-react";
import { db } from "@/lib/firebase/config";
import { ref, get, onValue, set, update, remove } from "firebase/database";
import toast from "react-hot-toast";

// Zaman aralıkları
const timeSlots = [
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
  "23:00",
  "00:00",
];

// Dakika cinsinden zaman hesaplama
const getTimeInMinutes = (timeString: string) => {
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
};

// Zaman dilimini dakika cinsinden hesaplama
const getTimeDifference = (start: string, end: string) => {
  return getTimeInMinutes(end) - getTimeInMinutes(start);
};

// Zamanı formatlama
const formatTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}`;
};

// Bir zaman dilimine dakika ekleme
const addTimeMinutes = (time: string, minutesToAdd: number) => {
  const totalMinutes = getTimeInMinutes(time) + minutesToAdd;
  return formatTime(totalMinutes);
};

interface Reservation {
  id: string;
  tableId: string;
  customerName: string;
  guestCount: number;
  startTime: string;
  endTime: string;
  status: "confirmed" | "pending" | "cancelled";
  note: string;
  date: string;
}

interface Table {
  id: string;
  number: number;
  capacity: number;
  categoryId: string;
  status: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
  borderColor: string;
  backgroundColor: string;
}

export default function RezervasyonPaneli() {
  // State tanımlamaları
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] =
    useState<Reservation | null>(null);
  const [draggingReservation, setDraggingReservation] =
    useState<Reservation | null>(null);
  const [isFullScreenMode, setIsFullScreenMode] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAllTables, setShowAllTables] = useState(false);
  const [filteredTables, setFilteredTables] = useState<Table[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [resizingReservation, setResizingReservation] = useState<{
    id: string;
    direction: "start" | "end";
  } | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{
    tableId: string;
    time: string;
  } | null>(null);

  // Referanslar
  const calendarRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Form değerleri
  const [formValues, setFormValues] = useState<Partial<Reservation>>({
    customerName: "",
    guestCount: 2,
    tableId: "",
    startTime: "19:00",
    endTime: "21:00",
    status: "confirmed" as "confirmed" | "pending" | "cancelled",
    note: "",
    date: format(new Date(), "yyyy-MM-dd"),
  });

  // Verileri yükle
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log("Veri yükleme başladı...");

        // Kategorileri yükle
        const categoriesRef = ref(db, "table_categories");
        console.log("Kategoriler için referans oluşturuldu:", categoriesRef);
        const categoriesSnapshot = await get(categoriesRef);
        console.log(
          "Kategori snapshot:",
          categoriesSnapshot.exists() ? "Veri var" : "Veri yok"
        );

        if (categoriesSnapshot.exists()) {
          const categoriesData = categoriesSnapshot.val();
          console.log("Kategori verileri:", categoriesData);
          const loadedCategories = Object.entries(categoriesData).map(
            ([id, data]: [string, any]) => ({
              id,
              name: data.name,
              color: data.color || "#4f46e5",
              borderColor: data.borderColor || "#3730a3",
              backgroundColor: data.backgroundColor || "#eef2ff",
            })
          );
          setCategories(loadedCategories);
          console.log("Yüklenen kategoriler:", loadedCategories.length);

          // İlk kategoriyi varsayılan olarak seç
          if (loadedCategories.length > 0 && !activeCategory) {
            setActiveCategory(loadedCategories[0].id);
          }
        } else {
          console.log("Kategori verisi bulunamadı!");
        }

        // Masaları yükle
        const tablesRef = ref(db, "tables");
        console.log("Masalar için referans oluşturuldu:", tablesRef);
        const tablesSnapshot = await get(tablesRef);
        console.log(
          "Masa snapshot:",
          tablesSnapshot.exists() ? "Veri var" : "Veri yok"
        );

        if (tablesSnapshot.exists()) {
          const tablesData = tablesSnapshot.val();
          console.log("Masa verileri:", tablesData);
          const loadedTables = Object.entries(tablesData).map(
            ([id, data]: [string, any]) => ({
              id,
              number: data.number || parseInt(id.replace("table", "")) || 0,
              capacity: data.capacity || 2,
              categoryId: data.category_id || data.category || "salon",
              status: data.status === "active" ? "Available" : "Unavailable",
            })
          );
          setTables(loadedTables);
          console.log("Yüklenen masalar:", loadedTables.length);
        } else {
          console.log("Masa verisi bulunamadı!");

          // Örnek masalar oluştur (debug için)
          const dummyTables = [
            {
              id: "table1",
              number: 1,
              capacity: 4,
              categoryId: "salon",
              status: "Available",
            },
            {
              id: "table2",
              number: 2,
              capacity: 2,
              categoryId: "salon",
              status: "Available",
            },
            {
              id: "table3",
              number: 3,
              capacity: 6,
              categoryId: "bahce",
              status: "Available",
            },
            {
              id: "table4",
              number: 4,
              capacity: 4,
              categoryId: "bahce",
              status: "Available",
            },
            {
              id: "table5",
              number: 5,
              capacity: 8,
              categoryId: "teras",
              status: "Available",
            },
          ];
          setTables(dummyTables);
          toast.success("Örnek masa verileri gösteriliyor (test için)");
          console.log("Örnek masalar oluşturuldu:", dummyTables.length);
        }

        // Rezervasyonları yükle
        const reservationsRef = ref(db, "reservations");
        console.log(
          "Rezervasyonlar için referans oluşturuldu:",
          reservationsRef
        );

        onValue(reservationsRef, (snapshot) => {
          console.log(
            "Rezervasyon snapshot:",
            snapshot.exists() ? "Veri var" : "Veri yok"
          );

          if (snapshot.exists()) {
            const reservationsData = snapshot.val();
            console.log("Rezervasyon verileri:", reservationsData);
            const loadedReservations = Object.entries(reservationsData)
              .filter(([_, data]: [string, any]) => {
                // Seçili tarihteki rezervasyonları filtrele
                const reservationDate =
                  data.date || format(new Date(), "yyyy-MM-dd");
                const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
                return reservationDate === selectedDateStr;
              })
              .map(([id, data]: [string, any]) => ({
                id,
                tableId: data.tableId,
                customerName: data.customerName,
                guestCount: data.guestCount || 1,
                startTime: data.startTime,
                endTime: data.endTime,
                status: data.status || "confirmed",
                note: data.note || "",
                date: data.date || format(new Date(), "yyyy-MM-dd"),
              }));
            setReservations(loadedReservations);
            console.log("Yüklenen rezervasyonlar:", loadedReservations.length);
          } else {
            console.log("Rezervasyon verisi bulunamadı!");
            setReservations([]);
          }
        });

        setLoading(false);
      } catch (err) {
        console.error("Veri yükleme hatası:", err);
        toast.error(
          "Veriler yüklenirken bir hata oluştu. Detaylar için konsola bakın."
        );

        // Dummy veri ile devam et
        const dummyCategories = [
          {
            id: "salon",
            name: "Salon",
            color: "#4f46e5",
            borderColor: "#3730a3",
            backgroundColor: "#eef2ff",
          },
          {
            id: "bahce",
            name: "Bahçe",
            color: "#16a34a",
            borderColor: "#166534",
            backgroundColor: "#dcfce7",
          },
          {
            id: "vip",
            name: "VIP",
            color: "#b91c1c",
            borderColor: "#7f1d1d",
            backgroundColor: "#fee2e2",
          },
        ];

        const dummyTables = [
          {
            id: "table1",
            number: 1,
            capacity: 4,
            categoryId: "salon",
            status: "Available",
          },
          {
            id: "table2",
            number: 2,
            capacity: 2,
            categoryId: "salon",
            status: "Available",
          },
          {
            id: "table3",
            number: 3,
            capacity: 6,
            categoryId: "bahce",
            status: "Available",
          },
          {
            id: "table4",
            number: 4,
            capacity: 4,
            categoryId: "bahce",
            status: "Available",
          },
          {
            id: "table5",
            number: 5,
            capacity: 8,
            categoryId: "vip",
            status: "Available",
          },
        ];

        setCategories(dummyCategories);
        setTables(dummyTables);
        setReservations([]);

        toast.success("Örnek veriler gösteriliyor (test için)");
        setLoading(false);
      }
    };

    loadData();
  }, [selectedDate, activeCategory]);

  // Takvim dışında bir yere tıklandığında takvimi kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setIsCalendarOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Önceki güne git
  const goToPreviousDay = () => {
    setSelectedDate((prevDate) => subDays(prevDate, 1));
  };

  // Sonraki güne git
  const goToNextDay = () => {
    setSelectedDate((prevDate) => addDays(prevDate, 1));
  };

  // Bugüne git
  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Gün seçimi
  const handleDaySelect = (day: Date | undefined) => {
    if (day) {
      setSelectedDate(day);
      setIsCalendarOpen(false);
    }
  };

  // Kategori değiştirme
  const changeCategory = (categoryId: string | null) => {
    setActiveCategory(categoryId);
  };

  // Kategori başlığı oluşturma
  const renderCategoryTabs = () => {
    return (
      <div className="bg-white rounded-lg shadow mb-4 p-2 overflow-hidden">
        <h3 className="text-sm font-medium text-gray-500 ml-2 mb-2">
          Masa Kategorileri
        </h3>
        <div className="flex flex-wrap gap-2 p-2">
          <button
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 whitespace-nowrap transition-all ${
              activeCategory === ""
                ? "bg-blue-50 text-blue-600 shadow-sm border border-blue-200"
                : "bg-gray-50 hover:bg-gray-100"
            }`}
            onClick={handleShowAllTables}
          >
            <span>Tüm Masalar</span>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
              {tables.length}
            </span>
          </button>

          {categories.map((category) => (
            <button
              key={category.id}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 whitespace-nowrap transition-all ${
                activeCategory === category.id
                  ? "shadow-sm border"
                  : "bg-gray-50 hover:bg-gray-100"
              }`}
              style={
                activeCategory === category.id
                  ? {
                      backgroundColor: `${category.backgroundColor}`,
                      color: `${category.color}`,
                      borderColor: `${category.borderColor || category.color}`,
                    }
                  : {}
              }
              onClick={() => changeCategory(category.id)}
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: category.color }}
              ></span>
              <span>{category.name}</span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor:
                    activeCategory === category.id
                      ? `${category.color}20`
                      : "rgba(229, 231, 235, 1)",
                  color:
                    activeCategory === category.id
                      ? category.color
                      : "rgba(75, 85, 99, 1)",
                }}
              >
                {tables.filter((t) => t.categoryId === category.id).length}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Düz masa listesi oluştur - kategorilere göre gruplama olmadan
  const flatTablesList = useMemo(() => {
    // Kategori sırasına göre düz liste oluştur
    const flatList: { table: Table; category: Category }[] = [];

    // Kategori gruplarını ve masaları ekle
    categories.forEach((category) => {
      const tablesInCategory = tables.filter(
        (t) => t.categoryId === category.id
      );

      // Her kategori için masaları ekle
      tablesInCategory.forEach((table) => {
        flatList.push({
          table,
          category,
        });
      });
    });

    // Kategorisi bilinmeyen masaları ekle
    const unknownCategoryTables = tables.filter(
      (table) => !categories.some((c) => c.id === table.categoryId)
    );

    unknownCategoryTables.forEach((table) => {
      flatList.push({
        table,
        category: {
          id: "unknown",
          name: "Diğer",
          color: "#6b7280",
          borderColor: "#4b5563",
          backgroundColor: "#f3f4f6",
        },
      });
    });

    return flatList;
  }, [tables, categories]);

  // Masaları kategoriye göre grupla
  const groupedByCategoryTables = useMemo(() => {
    // Kategori grupları oluştur
    const grouped: Record<string, { category: Category; tables: Table[] }> = {};

    // Kategorileri sırayla ekle
    categories.forEach((category) => {
      grouped[category.id] = {
        category,
        tables: tables.filter((t) => t.categoryId === category.id),
      };
    });

    // Kategorisi bilinmeyen masaları kontrol et
    const unknownCategoryTables = tables.filter(
      (table) => !categories.some((c) => c.id === table.categoryId)
    );

    if (unknownCategoryTables.length > 0) {
      const unknownCategory = {
        id: "unknown",
        name: "Diğer",
        color: "#6b7280",
        borderColor: "#4b5563",
        backgroundColor: "#f3f4f6",
      };

      grouped["unknown"] = {
        category: unknownCategory,
        tables: unknownCategoryTables,
      };
    }

    return grouped;
  }, [tables, categories]);

  // Filtrelenmiş masaları göster
  useEffect(() => {
    if (activeCategory && activeCategory !== "") {
      setFilteredTables(
        tables.filter((table) => table.categoryId === activeCategory)
      );
    } else if (showAllTables) {
      setFilteredTables(tables);
    } else {
      setFilteredTables([]);
    }
  }, [activeCategory, tables, showAllTables]);

  // Masaları kategoriye göre filtrele
  const displayedTables = useMemo(() => {
    if (activeCategory && activeCategory !== "") {
      return flatTablesList.filter(
        ({ table }) => table.categoryId === activeCategory
      );
    }

    if (searchTerm) {
      return flatTablesList.filter(({ table }) =>
        table.number.toString().includes(searchTerm)
      );
    }

    return showAllTables ? flatTablesList : [];
  }, [activeCategory, flatTablesList, searchTerm, showAllTables]);

  // Zaman dilimi içindeki rezervasyonu bul
  const getReservationAtTime = (tableId: string, time: string) => {
    return reservations.find(
      (res) =>
        res.tableId === tableId &&
        getTimeInMinutes(res.startTime) <= getTimeInMinutes(time) &&
        getTimeInMinutes(res.endTime) > getTimeInMinutes(time)
    );
  };

  // Zaman hücresine tıklama
  const handleCellClick = (tableId: string, time: string) => {
    const existingReservation = getReservationAtTime(tableId, time);

    if (existingReservation) {
      // Mevcut rezervasyonu düzenle
      setEditingReservation(existingReservation);
      setFormValues({
        customerName: existingReservation.customerName,
        guestCount: existingReservation.guestCount,
        startTime: existingReservation.startTime,
        endTime: existingReservation.endTime,
        tableId: existingReservation.tableId,
        status: existingReservation.status,
        note: existingReservation.note || "",
      });
    } else {
      // Yeni rezervasyon oluştur
      const endTime = addTimeMinutes(time, 90); // Varsayılan 1.5 saat süre
      setEditingReservation(null);
      setFormValues({
        customerName: "",
        guestCount: 2,
        startTime: time,
        endTime,
        tableId,
        status: "confirmed",
        note: "",
      });
    }

    setIsReservationModalOpen(true);
  };

  // Rezervasyon Kaydet
  const handleSaveReservation = async () => {
    try {
      const {
        customerName,
        guestCount,
        startTime,
        endTime,
        tableId,
        status,
        note,
      } = formValues;

      if (!customerName || !tableId || !startTime || !endTime) {
        toast.error("Lütfen gerekli alanları doldurun");
        return;
      }

      const reservationDate = format(selectedDate, "yyyy-MM-dd");

      // Çakışma kontrolü
      const isOverlapping = reservations.some((res) => {
        // Düzenlenen rezervasyonu kontrol dışı tut
        if (editingReservation && res.id === editingReservation.id)
          return false;

        if (res.tableId !== tableId || res.date !== reservationDate)
          return false;

        // Zaman çakışması kontrolü
        const newStart = getTimeInMinutes(startTime);
        const newEnd = getTimeInMinutes(endTime);
        const resStart = getTimeInMinutes(res.startTime);
        const resEnd = getTimeInMinutes(res.endTime);

        return newStart < resEnd && newEnd > resStart;
      });

      if (isOverlapping) {
        toast.error(
          "Bu masa için seçilen zaman diliminde başka bir rezervasyon bulunuyor"
        );
        return;
      }

      const reservationData = {
        customerName,
        guestCount: Number(guestCount),
        startTime,
        endTime,
        tableId,
        status,
        note,
        date: reservationDate,
      };

      if (editingReservation) {
        // Mevcut rezervasyonu güncelle
        const reservationRef = ref(db, `reservations/${editingReservation.id}`);
        await update(reservationRef, reservationData);
        toast.success("Rezervasyon güncellendi");
      } else {
        // Yeni rezervasyon oluştur
        const newReservationRef = ref(db, "reservations");
        const newReservation = { ...reservationData };
        const newReservationKey = newReservation.tableId + "_" + Date.now();
        await set(ref(db, `reservations/${newReservationKey}`), newReservation);
        toast.success("Rezervasyon oluşturuldu");
      }

      setIsReservationModalOpen(false);
    } catch (error) {
      console.error("Rezervasyon kaydedilirken hata:", error);
      toast.error("Rezervasyon kaydedilirken bir hata oluştu");
    }
  };

  // Rezervasyon Sil
  const handleDeleteReservation = async () => {
    if (!editingReservation) return;

    try {
      const reservationRef = ref(db, `reservations/${editingReservation.id}`);
      await remove(reservationRef);
      toast.success("Rezervasyon silindi");
      setIsReservationModalOpen(false);
    } catch (error) {
      console.error("Rezervasyon silinirken hata:", error);
      toast.error("Rezervasyon silinirken bir hata oluştu");
    }
  };

  // Sürükle bırak işlemleri
  const handleDragStart = (reservation: Reservation) => {
    setDraggingReservation(reservation);
  };

  const handleDragOver = (
    e: React.DragEvent,
    tableId: string,
    time: string
  ) => {
    e.preventDefault();
    setHoveredCell({ tableId, time });
  };

  const handleDrop = async (
    e: React.DragEvent,
    tableId: string,
    time: string
  ) => {
    e.preventDefault();
    if (!draggingReservation) return;

    try {
      const originalReservation = { ...draggingReservation };
      const startIndex = timeSlots.findIndex(
        (slot) => slot === originalReservation.startTime
      );
      const endIndex = timeSlots.findIndex(
        (slot) => slot === originalReservation.endTime
      );
      const duration = endIndex - startIndex;

      // Hedef zaman dilimini hesapla
      const newStartIndex = timeSlots.findIndex((slot) => slot === time);
      const newStartTime = time;
      const newEndIndex = Math.min(
        newStartIndex + duration,
        timeSlots.length - 1
      );
      const newEndTime = timeSlots[newEndIndex];

      // Çakışma kontrolü
      const isOverlapping = reservations.some((res) => {
        if (res.id === originalReservation.id) return false;
        if (res.tableId !== tableId) return false;
        if (res.date !== originalReservation.date) return false;

        const resStart = getTimeInMinutes(res.startTime);
        const resEnd = getTimeInMinutes(res.endTime);
        const newStart = getTimeInMinutes(newStartTime);
        const newEnd = getTimeInMinutes(newEndTime);

        return newStart < resEnd && newEnd > resStart;
      });

      if (isOverlapping) {
        toast.error("Bu zaman diliminde başka bir rezervasyon var");
        return;
      }

      // Rezervasyonu güncelle
      const updatedReservation = {
        ...originalReservation,
        tableId,
        startTime: newStartTime,
        endTime: newEndTime,
      };

      const reservationRef = ref(db, `reservations/${originalReservation.id}`);
      await update(reservationRef, updatedReservation);

      setDraggingReservation(null);
      toast.success("Rezervasyon taşındı");
    } catch (error) {
      console.error("Rezervasyon taşıma hatası:", error);
      toast.error("Rezervasyon taşınırken bir hata oluştu");
    }
  };

  // Rezervasyon yeniden boyutlandırma başlatma
  const handleResizeStart = (
    e: React.MouseEvent,
    reservationId: string,
    direction: "start" | "end"
  ) => {
    e.stopPropagation();
    setResizingReservation({ id: reservationId, direction });

    // Kullanıcıya bilgi ver
    const actionText = direction === "start" ? "başlangıç" : "bitiş";
    toast.success(
      `Rezervasyon ${actionText} zamanını değiştirmek için, zamanı seçin ve tıklayın`,
      {
        duration: 3000,
        position: "bottom-center",
        id: "resize-toast", // Aynı ID'yi kullanarak önceki toast'ın üzerine yazma
      }
    );
  };

  // Rezervasyon yeniden boyutlandırma bitirme
  const handleResizeEnd = async (time: string) => {
    if (!resizingReservation) return;

    try {
      const reservation = reservations.find(
        (r) => r.id === resizingReservation.id
      );

      if (!reservation) {
        setResizingReservation(null);
        setHoveredCell(null);
        return;
      }

      let newStartTime = reservation.startTime;
      let newEndTime = reservation.endTime;

      if (resizingReservation.direction === "start") {
        newStartTime = time;
      } else {
        newEndTime = time;
      }

      // Geçerli zaman kontrolü
      if (getTimeInMinutes(newStartTime) >= getTimeInMinutes(newEndTime)) {
        toast.error("Başlangıç zamanı bitiş zamanından önce olmalıdır", {
          id: "resize-error",
        });
        return;
      }

      // Çakışma kontrolü
      const isOverlapping = reservations.some((res) => {
        if (res.id === reservation.id) return false;
        if (res.tableId !== reservation.tableId) return false;
        if (res.date !== reservation.date) return false;

        const resStart = getTimeInMinutes(res.startTime);
        const resEnd = getTimeInMinutes(res.endTime);
        const newStart = getTimeInMinutes(newStartTime);
        const newEnd = getTimeInMinutes(newEndTime);

        return newStart < resEnd && newEnd > resStart;
      });

      if (isOverlapping) {
        toast.error("Bu zaman diliminde başka bir rezervasyon var", {
          id: "resize-error",
        });
        return;
      }

      // Rezervasyonu güncelle
      const updatedReservation = {
        ...reservation,
        startTime: newStartTime,
        endTime: newEndTime,
      };

      const reservationRef = ref(db, `reservations/${reservation.id}`);
      await update(reservationRef, updatedReservation);

      toast.success("Rezervasyon süresi güncellendi", {
        id: "resize-success",
      });
    } catch (error) {
      console.error("Rezervasyon boyutlandırma hatası:", error);
      toast.error("Rezervasyon boyutlandırılırken bir hata oluştu", {
        id: "resize-error",
      });
    } finally {
      setResizingReservation(null);
      setHoveredCell(null);
    }
  };

  // Boyutlandırma işlemi iptal
  const handleCancelResize = () => {
    setResizingReservation(null);
    setHoveredCell(null);
    toast.dismiss("resize-toast");
  };

  // Klavye olaylarını dinle - Esc tuşu ile boyutlandırmayı iptal et
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && resizingReservation) {
        handleCancelResize();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [resizingReservation]);

  // Rezervasyon render
  const renderReservation = (reservation: Reservation, tableIndex: number) => {
    const startIndex = timeSlots.findIndex(
      (slot) => slot === reservation.startTime
    );
    const endIndex = timeSlots.findIndex(
      (slot) => slot === reservation.endTime
    );
    const duration = endIndex - startIndex;

    if (startIndex === -1) return null;

    // Rezervasyon tipi belirle
    let statusColor = "#00BCD4"; // Default mavi - Walk-in
    let statusText = "WALK-IN";
    let statusBadge = "WA";

    if (reservation.status === "confirmed") {
      if (reservation.customerName.toLowerCase().includes("walk")) {
        statusColor = "#00BCD4"; // Mavi - Walk-in
        statusText = "WALK-IN";
        statusBadge = "WA";
      } else {
        statusColor = "#E91E63"; // Pembe - Normal rezervasyon
        statusText = reservation.customerName;
        statusBadge = "RE";
      }
    } else if (reservation.status === "pending") {
      statusColor = "#FFC107"; // Sarı - Beklemede
      statusText = "PENDING";
      statusBadge = "PE";
    } else if (reservation.status === "cancelled") {
      statusColor = "#F44336"; // Kırmızı - İptal
      statusText = "CANCELLED";
      statusBadge = "CA";
    }

    // Boyutlandırma işlemi yapılıyorsa ve bu rezervasyon boyutlandırılıyorsa
    const isResizing =
      resizingReservation && resizingReservation.id === reservation.id;

    return (
      <div
        className={`absolute top-0 rounded-sm overflow-hidden z-10 flex items-center ${
          isResizing ? "ring-2 ring-blue-500" : "cursor-move"
        }`}
        style={{
          left: `${startIndex * 60}px`, // 60px is time slot width
          width: `${duration * 60}px`,
          height: "30px",
          backgroundColor: statusColor,
          transition: isResizing ? "none" : "all 0.1s ease",
        }}
        draggable={!isResizing}
        onDragStart={() => !isResizing && handleDragStart(reservation)}
      >
        {/* Sol resize handle */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-4 cursor-w-resize bg-gradient-to-r from-black to-transparent opacity-10 hover:opacity-40 z-20 transition-opacity ${
            isResizing && resizingReservation?.direction === "start"
              ? "opacity-40"
              : ""
          }`}
          onMouseDown={(e) => handleResizeStart(e, reservation.id, "start")}
        />

        {/* Masa numarası */}
        <div className="bg-black bg-opacity-20 h-full px-1 flex items-center justify-center">
          <span className="text-white text-xs font-medium">
            {reservation.guestCount}
          </span>
        </div>

        {/* Rezervasyon bilgisi */}
        <div className="flex-1 px-2 truncate">
          <span className="text-white text-xs uppercase font-medium truncate">
            {statusText}
          </span>
        </div>

        {/* Rezervasyon durumu */}
        <div className="bg-black bg-opacity-20 h-full px-1 flex items-center justify-center">
          <span className="text-white text-xs font-medium">{statusBadge}</span>
        </div>

        {/* İptal işareti - Opsiyonel */}
        {reservation.status === "cancelled" && (
          <div className="absolute right-1 top-1/2 transform -translate-y-1/2 text-white">
            <X className="w-3 h-3" />
          </div>
        )}

        {/* Sağ resize handle */}
        <div
          className={`absolute right-0 top-0 bottom-0 w-4 cursor-e-resize bg-gradient-to-l from-black to-transparent opacity-10 hover:opacity-40 z-20 transition-opacity ${
            isResizing && resizingReservation?.direction === "end"
              ? "opacity-40"
              : ""
          }`}
          onMouseDown={(e) => handleResizeStart(e, reservation.id, "end")}
        />
      </div>
    );
  };

  // Tüm masaları veya kategori masalarını göster
  const handleShowAllTables = () => {
    console.log("Tüm masaları göster fonksiyonu çağrıldı");
    setActiveCategory("");

    // Eğer kategori seçili değilse, tüm masaları göster
    if (activeCategory !== "") {
      // Bu sadece state değişimini görmek için
      setTimeout(() => {
        console.log("Tüm masalar gösteriliyor, aktif kategori temizlendi:", {
          activeCategory: "",
          tableSayisi: tables.length,
        });
      }, 0);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 text-gray-800">
      {/* Navbar */}
      <div className="flex justify-between items-center bg-white p-4 border-b border-gray-200 shadow-sm">
        <div className="flex items-center space-x-6">
          <div className="text-2xl font-bold text-blue-600">
            Rezervasyon Yönetimi
          </div>
          <div className="flex space-x-4">
            <Link
              href="/admin"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/settings"
              className="px-4 py-2 rounded-lg hover:bg-gray-100"
            >
              Sistem Ayarları
            </Link>
            <Link
              href="/admin/staff"
              className="px-4 py-2 rounded-lg hover:bg-gray-100"
            >
              Garson Yönetimi
            </Link>
            <Link
              href="/admin/customers"
              className="px-4 py-2 rounded-lg hover:bg-gray-100"
            >
              Müşteri Yönetimi
            </Link>
            <Link
              href="/reservation"
              className="px-4 py-2 rounded-lg hover:bg-gray-100"
            >
              Rezervasyon
            </Link>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/init-db"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Veritabanı Başlat
          </Link>
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-1">
            <LogOut className="w-4 h-4" />
            <span>Çıkış</span>
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <button
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            onClick={goToToday}
          >
            <Calendar className="w-4 h-4" />
            <span>Bugün</span>
          </button>
          <div className="flex items-center space-x-2">
            <button
              aria-label="Önceki gün"
              className="p-2 rounded-lg hover:bg-gray-100"
              onClick={goToPreviousDay}
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div
              className="relative font-medium text-lg cursor-pointer"
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              ref={calendarRef}
            >
              {format(selectedDate, "dd MMMM yyyy", { locale: tr })}

              {/* DatePicker Alanı */}
              {isCalendarOpen && (
                <div className="absolute z-10 mt-2 bg-white shadow-lg rounded-lg p-2 border">
                  <DayPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDaySelect}
                    locale={tr}
                    classNames={{
                      day_selected: "bg-blue-600 text-white rounded-md",
                      day_today: "border border-blue-500 rounded-md",
                      button: "hover:bg-blue-100 rounded-md",
                    }}
                    footer={
                      <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between">
                        <button
                          onClick={goToToday}
                          className="text-sm text-blue-600 hover:text-blue-800"
                          type="button"
                        >
                          Bugün
                        </button>
                        <button
                          onClick={() => setIsCalendarOpen(false)}
                          className="text-sm text-gray-600 hover:text-gray-800"
                          type="button"
                        >
                          Kapat
                        </button>
                      </div>
                    }
                  />
                </div>
              )}
            </div>
            <button
              aria-label="Sonraki gün"
              className="p-2 rounded-lg hover:bg-gray-100"
              onClick={goToNextDay}
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button className="p-2 rounded-lg hover:bg-gray-100 text-blue-600">
            <Filter className="w-5 h-5" />
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Ara..."
              className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button className="p-2 rounded-lg hover:bg-gray-100">
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-1"
            onClick={() => {
              setEditingReservation(null);
              setFormValues({
                customerName: "",
                guestCount: 2,
                startTime: "19:00",
                endTime: "21:00",
                tableId: tables.length > 0 ? tables[0].id : "",
                status: "confirmed",
                note: "",
              });
              setIsReservationModalOpen(true);
            }}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Yeni Rezervasyon</span>
          </button>
        </div>
      </div>

      {/* Ana içerik - Rezervasyon alanı */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400"></div>
            </div>
          ) : (
            <div className="flex flex-col space-y-4">
              {/* Kategori sekmeleri - Üste taşındı */}
              {renderCategoryTabs()}

              {/* Masa durumu özeti */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Toplam Masa
                  </h3>
                  <p className="text-2xl font-bold">{displayedTables.length}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Onaylı Rezervasyon
                  </h3>
                  <p className="text-2xl font-bold">
                    {
                      reservations.filter(
                        (r) =>
                          r.status === "confirmed" &&
                          (activeCategory
                            ? tables.find((t) => t.id === r.tableId)
                                ?.categoryId === activeCategory
                            : true)
                      ).length
                    }
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Bekleyen Rezervasyon
                  </h3>
                  <p className="text-2xl font-bold">
                    {
                      reservations.filter(
                        (r) =>
                          r.status === "pending" &&
                          (activeCategory
                            ? tables.find((t) => t.id === r.tableId)
                                ?.categoryId === activeCategory
                            : true)
                      ).length
                    }
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    İptal Edilen
                  </h3>
                  <p className="text-2xl font-bold">
                    {
                      reservations.filter(
                        (r) =>
                          r.status === "cancelled" &&
                          (activeCategory
                            ? tables.find((t) => t.id === r.tableId)
                                ?.categoryId === activeCategory
                            : true)
                      ).length
                    }
                  </p>
                </div>
              </div>

              {/* Rezervasyon tablosu - Formitable tarzı - Resimde gösterilen yapıya uygun */}
              <div className="bg-white text-gray-800 rounded-lg shadow overflow-hidden">
                {/* Üst kısım - Saat başlıkları ve doluluk sayıları */}
                <div className="sticky top-0 z-30 bg-gray-50 flex border-b border-gray-200">
                  {/* Sol köşe - "Sitzend" gibi başlık */}
                  <div className="min-w-[130px] py-2 px-3 text-left text-xs font-medium uppercase tracking-wider bg-gray-50 border-r border-gray-200 flex justify-between items-center">
                    <span>Sitzend</span>
                    <span className="text-gray-400">›</span>
                  </div>

                  {/* Saat başlıkları */}
                  {timeSlots.map((time) => (
                    <div
                      key={time}
                      className="min-w-[60px] py-2 px-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200"
                    >
                      {time}
                    </div>
                  ))}
                </div>

                {/* Boyutlandırma işlemi yapılıyorsa iptal butonu göster */}
                {resizingReservation && (
                  <div className="absolute top-2 right-2 z-50">
                    <button
                      className="bg-red-500 text-white px-2 py-1 rounded text-xs flex items-center shadow-lg"
                      onClick={handleCancelResize}
                    >
                      <X className="w-4 h-4 mr-1" />
                      İptal
                    </button>
                  </div>
                )}

                {/* Ana içerik - Kategoriler ve masalar */}
                <div className="flex flex-col relative">
                  {/* Şu anki zaman çizgisi göstergesi - Sadece masa listesi içinde görünecek */}
                  <div
                    className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-30 pointer-events-none"
                    style={{
                      left: `calc(130px + ${
                        timeSlots.findIndex((slot) => {
                          const now = new Date();
                          const hour = now.getHours();
                          const minute = now.getMinutes();
                          const currentTime = `${hour
                            .toString()
                            .padStart(2, "0")}:${minute
                            .toString()
                            .padStart(2, "0")}`;
                          return (
                            getTimeInMinutes(slot) >=
                            getTimeInMinutes(currentTime)
                          );
                        }) * 60
                      }px)`,
                    }}
                  ></div>

                  {Object.entries(groupedByCategoryTables).map(
                    ([categoryId, { category, tables }]) => (
                      <div key={categoryId} className="category-group">
                        {/* Kategori başlığı */}
                        <div
                          className="px-3 py-2 font-medium text-white uppercase tracking-wider text-sm border-b border-gray-200"
                          style={{
                            backgroundColor: category.color,
                          }}
                        >
                          {category.name}
                        </div>

                        {/* Bu kategorideki masalar */}
                        {tables.map((table) => {
                          // Masa için mevcut rezervasyonları bul
                          const tableReservations = reservations.filter(
                            (r) => r.tableId === table.id
                          );
                          const hasActiveReservation =
                            tableReservations.length > 0;

                          // Masanın minimum ve maksimum kişi sayısını göster
                          const capacityText =
                            table.capacity === 1
                              ? "1 - 1"
                              : `${Math.max(1, table.capacity - 1)} - ${
                                  table.capacity
                                }`;

                          return (
                            <div
                              className="flex border-b border-gray-200"
                              key={table.id}
                            >
                              {/* Masa bilgisi */}
                              <div
                                className={`min-w-[130px] h-[30px] py-1 px-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 ${
                                  formValues.tableId === table.id
                                    ? "bg-blue-50"
                                    : ""
                                }`}
                                onClick={() => {
                                  setFormValues({
                                    ...formValues,
                                    tableId: table.id,
                                  });
                                }}
                              >
                                <div className="font-medium text-sm">
                                  {table.number}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <div className="text-gray-500 text-xs">
                                    {capacityText}
                                  </div>
                                  {hasActiveReservation && (
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                  )}
                                </div>
                              </div>

                              {/* Zaman hücreleri ve rezervasyonlar */}
                              <div className="flex-1 flex relative">
                                {timeSlots.map((time, timeIndex) => (
                                  <div
                                    key={`${table.id}-${time}`}
                                    className={`min-w-[60px] h-[30px] border-r border-gray-200 relative cursor-pointer ${
                                      timeIndex % 2 === 0
                                        ? "bg-gray-50"
                                        : "bg-white"
                                    } ${
                                      resizingReservation
                                        ? "hover:bg-blue-100"
                                        : "hover:bg-gray-100"
                                    }`}
                                    onClick={() =>
                                      resizingReservation
                                        ? handleResizeEnd(time)
                                        : handleCellClick(table.id, time)
                                    }
                                    onMouseEnter={() =>
                                      setHoveredCell({
                                        tableId: table.id,
                                        time: time,
                                      })
                                    }
                                    onMouseLeave={() => setHoveredCell(null)}
                                    onDragOver={(e) =>
                                      handleDragOver(e, table.id, time)
                                    }
                                    onDrop={(e) =>
                                      handleDrop(e, table.id, time)
                                    }
                                  >
                                    {/* Sadece boyutlandırma işlemi sırasında ve fare üzerine geldiğinde göster */}
                                    {resizingReservation &&
                                      hoveredCell?.tableId === table.id &&
                                      hoveredCell?.time === time && (
                                        <div
                                          className="absolute inset-0 bg-blue-100 flex items-center justify-center border border-blue-300 z-10"
                                          onClick={() => handleResizeEnd(time)}
                                        >
                                          <div className="text-blue-700 text-xs font-medium flex items-center">
                                            {resizingReservation.direction ===
                                            "start" ? (
                                              <>
                                                <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  className="h-3 w-3 mr-1"
                                                  fill="none"
                                                  viewBox="0 0 24 24"
                                                  stroke="currentColor"
                                                >
                                                  <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M11 17l-5-5m0 0l5-5m-5 5h12"
                                                  />
                                                </svg>
                                                <span>Başlat</span>
                                              </>
                                            ) : (
                                              <>
                                                <span>Bitir</span>
                                                <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  className="h-3 w-3 ml-1"
                                                  fill="none"
                                                  viewBox="0 0 24 24"
                                                  stroke="currentColor"
                                                >
                                                  <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                                                  />
                                                </svg>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                  </div>
                                ))}

                                {/* Rezervasyonlar */}
                                {tableReservations.map((reservation) =>
                                  renderReservation(
                                    reservation,
                                    tables.indexOf(table)
                                  )
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                  )}
                </div>
              </div>

              {displayedTables.length === 0 && (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <p className="text-gray-500 mb-4">
                    Herhangi bir masa bulunamadı.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Rezervasyon Ekleme/Düzenleme Modalı */}
      {isReservationModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {editingReservation
                  ? "Rezervasyon Düzenle"
                  : "Yeni Rezervasyon"}
              </h3>
              <button
                className="text-gray-400 hover:text-gray-500"
                onClick={() => setIsReservationModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Müşteri Adı
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={formValues.customerName}
                  onChange={(e) =>
                    setFormValues({
                      ...formValues,
                      customerName: e.target.value,
                    })
                  }
                  placeholder="Müşteri adı"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kişi Sayısı
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={formValues.guestCount}
                    onChange={(e) =>
                      setFormValues({
                        ...formValues,
                        guestCount: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Masa
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={formValues.tableId}
                    onChange={(e) =>
                      setFormValues({ ...formValues, tableId: e.target.value })
                    }
                  >
                    <option value="">Masa Seçin</option>
                    {tables.map((table) => {
                      const category = categories.find(
                        (c) => c.id === table.categoryId
                      );
                      return (
                        <option key={table.id} value={table.id}>
                          Masa {table.number} -{" "}
                          {category?.name || "Kategori Yok"} ({table.capacity}{" "}
                          kişilik)
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Başlangıç Saati
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={formValues.startTime}
                    onChange={(e) =>
                      setFormValues({
                        ...formValues,
                        startTime: e.target.value,
                      })
                    }
                  >
                    {timeSlots.map((time) => (
                      <option key={`start-${time}`} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bitiş Saati
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={formValues.endTime}
                    onChange={(e) =>
                      setFormValues({ ...formValues, endTime: e.target.value })
                    }
                  >
                    {timeSlots.map((time) => (
                      <option
                        key={`end-${time}`}
                        value={time}
                        disabled={
                          getTimeInMinutes(time) <=
                          getTimeInMinutes(formValues.startTime || "19:00")
                        }
                      >
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Durum
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={formValues.status}
                  onChange={(e) =>
                    setFormValues({
                      ...formValues,
                      status: e.target.value as
                        | "confirmed"
                        | "pending"
                        | "cancelled",
                    })
                  }
                >
                  <option value="confirmed">Onaylandı</option>
                  <option value="pending">Beklemede</option>
                  <option value="cancelled">İptal Edildi</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Not
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={formValues.note}
                  onChange={(e) =>
                    setFormValues({ ...formValues, note: e.target.value })
                  }
                  rows={3}
                  placeholder="Rezervasyon hakkında not ekleyin"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end space-x-3">
              {editingReservation && (
                <button
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  onClick={handleDeleteReservation}
                >
                  Sil
                </button>
              )}
              <button
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                onClick={() => setIsReservationModalOpen(false)}
              >
                İptal
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                onClick={handleSaveReservation}
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
