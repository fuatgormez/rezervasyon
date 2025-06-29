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
import DraggableReservationCard from "../reservation/DraggableReservationCard";
import RestaurantSelector from "../RestaurantSelector";
import { useAuthContext } from "@/lib/firebase/context";
import { useAuth } from "@/lib/firebase/hooks";
import { useRouter } from "next/navigation";
import AdminHeader from "./AdminHeader";

// Time slots artık dinamik olarak component içinde oluşturuluyor

// Helper functions
const getTimeInMinutes = (timeString: string) => {
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
};

const getTimeDifference = (start: string, end: string) => {
  return getTimeInMinutes(end) - getTimeInMinutes(start);
};

const formatTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}`;
};

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
  minCapacity?: number;
  maxCapacity?: number;
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

export default function ReservationPanel() {
  // Multi-tenant context
  const { selectedRestaurant, company, user } = useAuthContext();
  const { logout } = useAuth();
  const router = useRouter();

  // Mock restaurant data eğer selectedRestaurant yoksa - useMemo ile optimize et
  const currentRestaurant = useMemo(() => {
    if (selectedRestaurant) return selectedRestaurant;

    return {
      id: "restaurant-1",
      name: "Test Restaurant",
      companyId: "company-1",
      address: "Test Address",
      phone: "123456789",
      email: "test@restaurant.com",
      openingTime: "07:00",
      closingTime: "02:00",
      isActive: true,
    };
  }, [selectedRestaurant]);

  // Dinamik saat aralığı - restoran açılış/kapanış saatlerine göre
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    const openingHour = parseInt(
      currentRestaurant.openingTime?.split(":")[0] || "7"
    );
    const closingHour = parseInt(
      currentRestaurant.closingTime?.split(":")[0] || "2"
    );

    // Açılış saatinden başla
    let hour = openingHour;

    // Kapanış saati ertesi gün ise (örn: 02:00)
    const endHour = closingHour < openingHour ? closingHour + 24 : closingHour;

    while (hour <= endHour) {
      const displayHour = (hour % 24).toString().padStart(2, "0");
      slots.push(`${displayHour}:00`);
      hour++;
    }

    return slots;
  }, [currentRestaurant.openingTime, currentRestaurant.closingTime]);

  // State declarations
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
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAllTables, setShowAllTables] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [resizingReservation, setResizingReservation] = useState<{
    id: string;
    direction: "start" | "end";
  } | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{
    tableId: string;
    time: string;
  } | null>(null);

  // Resize için state'ler
  const [dragResizing, setDragResizing] = useState<{
    id: string;
    direction: "start" | "end";
    startX: number;
    originalStartTime: string;
    originalEndTime: string;
    tableId: string;
  } | null>(null);

  const [dragResizePreview, setDragResizePreview] = useState<{
    startTime: string;
    endTime: string;
  } | null>(null);

  const [resizeHoveredCell, setResizeHoveredCell] = useState<{
    tableId: string;
    time: string;
  } | null>(null);

  // Refs
  const calendarRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const timeHeaderRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);

  // Form values
  const [formValues, setFormValues] = useState<Partial<Reservation>>({
    customerName: "",
    guestCount: 2,
    tableId: "",
    startTime: "19:00",
    endTime: "20:00",
    status: "confirmed",
    note: "",
    date: format(new Date(), "yyyy-MM-dd"),
  });

  // Auto scroll to current time on load
  useEffect(() => {
    const scrollToCurrentTime = () => {
      console.log("🔧 scrollToCurrentTime called");
      if (mainScrollRef.current) {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        const currentMinutes = hour * 60 + minute;
        const baseMinutes = 7 * 60; // 07:00
        const relativeMinutes = currentMinutes - baseMinutes;

        console.log("🔧 Current time:", {
          hour,
          minute,
          currentMinutes,
          baseMinutes,
          relativeMinutes,
        });

        // Eğer saat 07:00'dan önce ise (gece saatleri), ertesi güne ekle
        let scrollPosition;
        if (hour < 7) {
          const adjustedMinutes = (hour + 24) * 60 + minute;
          const adjustedRelative = adjustedMinutes - baseMinutes;
          scrollPosition = (adjustedRelative / 60) * 150; // Her saat 150px
        } else {
          scrollPosition = (relativeMinutes / 60) * 150; // Her saat 150px
        }

        // Sayfanın ortasına getir
        const containerWidth = mainScrollRef.current.clientWidth;
        const centerOffset = containerWidth / 2;
        const finalScrollPosition = Math.max(0, scrollPosition - centerOffset);

        console.log("🔧 Scroll calculation:", {
          scrollPosition,
          containerWidth,
          centerOffset,
          finalScrollPosition,
        });

        setTimeout(() => {
          if (mainScrollRef.current) {
            mainScrollRef.current.scrollLeft = finalScrollPosition;
            console.log("🔧 Scrolled to position:", finalScrollPosition);
          }
        }, 100); // Biraz gecikme ile scroll yap
      } else {
        console.log("🔧 mainScrollRef.current is null");
      }
    };

    // Data yüklendikten sonra scroll yap
    if (!loading && tables.length > 0) {
      console.log(
        "🔧 Triggering scrollToCurrentTime. Loading:",
        loading,
        "Tables:",
        tables.length
      );
      scrollToCurrentTime();
    }
  }, [loading, tables.length]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      console.log("🔧 loadData called. currentRestaurant:", currentRestaurant);
      if (!currentRestaurant) {
        console.log("🔧 No currentRestaurant, exiting loadData");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log("🔧 Loading data for restaurant:", currentRestaurant.id);

        // Load categories for selected restaurant
        const categoriesRef = ref(db, "categories");
        const categoriesSnapshot = await get(categoriesRef);

        console.log(
          "🔧 Categories snapshot exists:",
          categoriesSnapshot.exists()
        );
        if (categoriesSnapshot.exists()) {
          const categoriesData = categoriesSnapshot.val();
          console.log("🔧 Raw categories data:", categoriesData);

          // Kategorilerin detaylarını göster
          Object.entries(categoriesData).forEach(
            ([id, data]: [string, any]) => {
              console.log(`🔧 Category ${id}:`, {
                name: data.name,
                restaurantId: data.restaurantId,
                color: data.color,
                fullData: data,
              });
            }
          );

          // Mevcut restaurant ID'leri kontrol et
          const restaurantIds = Object.values(categoriesData).map(
            (data: any) => data.restaurantId
          );
          console.log("🔧 Available restaurant IDs in categories:", [
            ...new Set(restaurantIds),
          ]);
          console.log("🔧 Looking for restaurant ID:", currentRestaurant.id);

          // Tüm kategorileri yükle (restaurant filter olmadan önce test edelim)
          const allCategories = Object.entries(categoriesData).map(
            ([id, data]: [string, any]) => ({
              id,
              name: data.name,
              color: data.color || "#4f46e5",
              borderColor: data.borderColor || "#3730a3",
              backgroundColor: data.backgroundColor || "#eef2ff",
              restaurantId: data.restaurantId,
            })
          );

          console.log("🔧 All available categories:", allCategories);

          const loadedCategories = allCategories.filter(
            (category) => category.restaurantId === currentRestaurant.id
          );
          console.log(
            "🔧 Filtered categories for restaurant:",
            loadedCategories
          );

          if (loadedCategories.length > 0) {
            console.log("🔧 Using filtered categories for restaurant");
            setCategories(loadedCategories);
            // Set first category as default if none is selected
            if (!activeCategory) {
              setActiveCategory(loadedCategories[0].id);
            }
          } else {
            console.log(
              "🔧 No categories found for current restaurant, loading demo categories"
            );
            // Demo kategoriler yükle
            const demoCategories = [
              {
                id: "salon",
                name: "Salon",
                color: "#4f46e5",
                borderColor: "#3730a3",
                backgroundColor: "#eef2ff",
              },
              {
                id: "terrace",
                name: "Teras",
                color: "#059669",
                borderColor: "#047857",
                backgroundColor: "#ecfccb",
              },
              {
                id: "vip",
                name: "VIP",
                color: "#dc2626",
                borderColor: "#b91c1c",
                backgroundColor: "#fef2f2",
              },
            ];
            setCategories(demoCategories);
            setActiveCategory(demoCategories[0].id);
          }
        } else {
          // Demo kategoriler yükle
          const demoCategories = [
            {
              id: "salon",
              name: "Salon",
              color: "#4f46e5",
              borderColor: "#3730a3",
              backgroundColor: "#eef2ff",
            },
            {
              id: "terrace",
              name: "Teras",
              color: "#059669",
              borderColor: "#047857",
              backgroundColor: "#ecfccb",
            },
            {
              id: "vip",
              name: "VIP",
              color: "#dc2626",
              borderColor: "#b91c1c",
              backgroundColor: "#fef2f2",
            },
          ];
          console.log("🔧 Loading demo categories:", demoCategories);
          setCategories(demoCategories);
          setActiveCategory(demoCategories[0].id);
        }

        // Load tables for selected restaurant
        const tablesRef = ref(db, "tables");
        const tablesSnapshot = await get(tablesRef);

        console.log("🔧 Tables snapshot exists:", tablesSnapshot.exists());
        if (tablesSnapshot.exists()) {
          const tablesData = tablesSnapshot.val();
          console.log("🔧 Raw tables data:", tablesData);

          // Masaların detaylarını göster
          Object.entries(tablesData)
            .slice(0, 5)
            .forEach(([id, data]: [string, any]) => {
              console.log(`🔧 Table ${id}:`, {
                number: data.number,
                category: data.category,
                category_id: data.category_id,
                restaurantId: data.restaurantId,
                capacity: data.capacity,
                fullData: data,
              });
            });

          // Mevcut restaurant ID'leri kontrol et
          const restaurantIds = Object.values(tablesData).map(
            (data: any) => data.restaurantId
          );
          console.log("🔧 Available restaurant IDs in tables:", [
            ...new Set(restaurantIds),
          ]);

          const loadedTables = Object.entries(tablesData)
            .filter(([id, data]: [string, any]) => {
              // Sadece seçili restorana ait masaları getir
              const restaurantMatch =
                data.restaurantId === currentRestaurant.id;
              console.log(`🔧 Table ${id} restaurant filter:`, {
                tableRestaurantId: data.restaurantId,
                currentRestaurantId: currentRestaurant.id,
                match: restaurantMatch,
              });
              return restaurantMatch;
            })
            .map(([id, data]: [string, any]) => {
              // Masa numarasını temizle - uzun isimleri kısalt
              let tableNumber = data.number || id;

              // Eğer masa ismi çok uzunsa, sadece son kısmını al
              if (typeof tableNumber === "string" && tableNumber.length > 10) {
                // "ANA-SALON-1" -> "1", "TERRACE-2" -> "2" gibi
                const parts = tableNumber.split("-");
                const lastPart = parts[parts.length - 1];
                tableNumber = lastPart || tableNumber;
              }

              // Eğer hala string ise ve sayı içeriyorsa, sayıyı çıkar
              if (typeof tableNumber === "string") {
                const numberMatch = tableNumber.match(/\d+/);
                if (numberMatch) {
                  tableNumber = parseInt(numberMatch[0]);
                }
              }

              // Firebase'deki gerçek kategori ID'sini kullan
              let categoryId = data.category_id || data.category;

              // Eğer categoryId yoksa, masa isminden tahmin et
              if (!categoryId) {
                const tableIdLower = id.toLowerCase();
                const tableNumberLower = (data.number || "")
                  .toString()
                  .toLowerCase();

                if (
                  tableIdLower.includes("ana-salon") ||
                  tableIdLower.includes("salon") ||
                  tableNumberLower.includes("salon")
                ) {
                  // "İç Mekan" kategorisini bul
                  const icMekanCategory = categories.find(
                    (c) => c.name === "İç Mekan"
                  );
                  categoryId = icMekanCategory
                    ? icMekanCategory.id
                    : categories[0]?.id;
                } else if (
                  tableIdLower.includes("bahce") ||
                  tableNumberLower.includes("bahce")
                ) {
                  // "Bahçe1" kategorisini bul
                  const bahceCategory = categories.find(
                    (c) => c.name === "Bahçe1"
                  );
                  categoryId = bahceCategory
                    ? bahceCategory.id
                    : categories[0]?.id;
                } else if (
                  tableIdLower.includes("terrace") ||
                  tableIdLower.includes("teras") ||
                  tableNumberLower.includes("terrace")
                ) {
                  // "Teras" kategorisini bul
                  const terasCategory = categories.find(
                    (c) => c.name === "Teras"
                  );
                  categoryId = terasCategory
                    ? terasCategory.id
                    : categories[0]?.id;
                } else if (
                  tableIdLower.includes("vip") ||
                  tableNumberLower.includes("vip")
                ) {
                  // VIP için "İç Mekan" kullan (veya istersen ayrı kategori)
                  const icMekanCategory = categories.find(
                    (c) => c.name === "İç Mekan"
                  );
                  categoryId = icMekanCategory
                    ? icMekanCategory.id
                    : categories[0]?.id;
                } else {
                  // Varsayılan olarak ilk kategoriyi kullan
                  categoryId =
                    categories.length > 0 ? categories[0].id : undefined;
                }
              }

              console.log(`🔧 Table ${id} category mapping:`, {
                originalCategoryId: data.category_id,
                originalCategory: data.category,
                finalCategoryId: categoryId,
                tableNumber: data.number,
                tableId: id,
                inferredFromName: !data.category_id && !data.category,
                availableCategories: categories.map((c) => ({
                  id: c.id,
                  name: c.name,
                })),
              });

              return {
                id,
                number: tableNumber,
                capacity: data.capacity || 2,
                categoryId,
                status: data.status === "active" ? "Available" : "Unavailable",
              };
            });
          console.log("🔧 Filtered tables for restaurant:", loadedTables);

          if (loadedTables.length === 0) {
            console.log(
              "🔧 No tables found for restaurant, loading demo tables"
            );
            // Demo masalar yükle
            const demoTables = [
              // Salon masaları
              {
                id: "table1",
                number: 1,
                capacity: 2,
                categoryId: "salon",
                status: "Available",
              },
              {
                id: "table2",
                number: 2,
                capacity: 4,
                categoryId: "salon",
                status: "Available",
              },
              {
                id: "table3",
                number: 3,
                capacity: 6,
                categoryId: "salon",
                status: "Available",
              },
              {
                id: "table4",
                number: 4,
                capacity: 4,
                categoryId: "salon",
                status: "Available",
              },
              {
                id: "table5",
                number: 5,
                capacity: 2,
                categoryId: "salon",
                status: "Available",
              },
              // Teras masaları
              {
                id: "table6",
                number: 6,
                capacity: 4,
                categoryId: "terrace",
                status: "Available",
              },
              {
                id: "table7",
                number: 7,
                capacity: 6,
                categoryId: "terrace",
                status: "Available",
              },
              {
                id: "table8",
                number: 8,
                capacity: 8,
                categoryId: "terrace",
                status: "Available",
              },
              // VIP masaları
              {
                id: "table9",
                number: 9,
                capacity: 4,
                categoryId: "vip",
                status: "Available",
              },
              {
                id: "table10",
                number: 10,
                capacity: 6,
                categoryId: "vip",
                status: "Available",
              },
            ];
            console.log("🔧 Setting demo tables:", demoTables.length);
            setTables(demoTables);
          } else {
            console.log("🔧 Setting loaded tables:", loadedTables.length);
            setTables(loadedTables);
          }
        } else {
          // Demo masalar yükle
          const demoTables = [
            // Salon masaları
            {
              id: "table1",
              number: 1,
              capacity: 2,
              categoryId: "salon",
              status: "Available",
            },
            {
              id: "table2",
              number: 2,
              capacity: 4,
              categoryId: "salon",
              status: "Available",
            },
            {
              id: "table3",
              number: 3,
              capacity: 6,
              categoryId: "salon",
              status: "Available",
            },
            {
              id: "table4",
              number: 4,
              capacity: 4,
              categoryId: "salon",
              status: "Available",
            },
            {
              id: "table5",
              number: 5,
              capacity: 2,
              categoryId: "salon",
              status: "Available",
            },
            // Teras masaları
            {
              id: "table6",
              number: 6,
              capacity: 4,
              categoryId: "terrace",
              status: "Available",
            },
            {
              id: "table7",
              number: 7,
              capacity: 6,
              categoryId: "terrace",
              status: "Available",
            },
            {
              id: "table8",
              number: 8,
              capacity: 8,
              categoryId: "terrace",
              status: "Available",
            },
            // VIP masaları
            {
              id: "table9",
              number: 9,
              capacity: 4,
              categoryId: "vip",
              status: "Available",
            },
            {
              id: "table10",
              number: 10,
              capacity: 6,
              categoryId: "vip",
              status: "Available",
            },
          ];
          console.log("🔧 Loading demo tables:", demoTables);
          setTables(demoTables);
        }

        // Load reservations
        const reservationsRef = ref(db, "reservations");
        onValue(reservationsRef, (snapshot) => {
          if (snapshot.exists()) {
            const reservationsData = snapshot.val();
            const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
            console.log("🔍 Debug: Selected date:", selectedDateStr);
            console.log("🔍 Debug: All reservations data:", reservationsData);

            const loadedReservations = Object.entries(reservationsData)
              .filter(([_, data]: [string, any]) => {
                const reservationDate =
                  data.date || format(new Date(), "yyyy-MM-dd");
                const isCorrectRestaurant =
                  data.restaurantId === currentRestaurant.id;
                const isCorrectDate = reservationDate === selectedDateStr;
                console.log(
                  `🔍 Debug: Reservation date: ${reservationDate}, Selected date: ${selectedDateStr}, Restaurant match: ${isCorrectRestaurant}, Date match: ${isCorrectDate}`
                );
                return isCorrectDate && isCorrectRestaurant;
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
            console.log("🔍 Debug: Filtered reservations:", loadedReservations);
            setReservations(loadedReservations);
          } else {
            console.log("🔍 Debug: No reservations found in Firebase");
            setReservations([]);
          }
        });

        setLoading(false);
      } catch (err) {
        console.error("Data loading error:", err);
        toast.error("Error loading data. Check console for details.");
        setLoading(false);
      }
    };

    loadData();
  }, [selectedDate, activeCategory, currentRestaurant]);

  // State güncellemelerini takip et
  useEffect(() => {
    console.log("🔧 Categories state updated:", categories.length);
  }, [categories]);

  useEffect(() => {
    console.log("🔧 Tables state updated:", tables.length);
  }, [tables]);

  // Close calendar when clicking outside
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

  // Navigation functions
  const goToPreviousDay = () => {
    setSelectedDate((prevDate) => subDays(prevDate, 1));
  };

  const goToNextDay = () => {
    setSelectedDate((prevDate) => addDays(prevDate, 1));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const handleDaySelect = (day: Date | undefined) => {
    if (day) {
      setSelectedDate(day);
      setIsCalendarOpen(false);
    }
  };

  const changeCategory = (categoryId: string | null) => {
    setActiveCategory(categoryId);
  };

  // Create flat table list grouped by categories
  const flatTablesList = useMemo(() => {
    const flatList: { table: Table; category: Category }[] = [];

    categories.forEach((category) => {
      const tablesInCategory = tables.filter(
        (t) => t.categoryId === category.id
      );

      tablesInCategory.forEach((table) => {
        flatList.push({
          table,
          category,
        });
      });
    });

    // Add tables with unknown categories
    const unknownCategoryTables = tables.filter(
      (table) => !categories.some((c) => c.id === table.categoryId)
    );

    unknownCategoryTables.forEach((table) => {
      flatList.push({
        table,
        category: {
          id: "unknown",
          name: "Other",
          color: "#6b7280",
          borderColor: "#4b5563",
          backgroundColor: "#f3f4f6",
        },
      });
    });

    return flatList;
  }, [tables, categories]);

  // Group tables by category
  const groupedByCategoryTables = useMemo(() => {
    const grouped: Record<string, { category: Category; tables: Table[] }> = {};

    categories.forEach((category) => {
      const categoryTables = tables.filter((t) => t.categoryId === category.id);
      grouped[category.id] = {
        category,
        tables: categoryTables,
      };
    });

    // Handle tables with unknown categories
    const unknownCategoryTables = tables.filter(
      (table) => !categories.some((c) => c.id === table.categoryId)
    );

    if (unknownCategoryTables.length > 0) {
      const unknownCategory = {
        id: "unknown",
        name: "Other",
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

  // Get reservation at specific time for a table
  const getReservationAtTime = (tableId: string, time: string) => {
    console.log(
      `🔍 getReservationAtTime called: tableId=${tableId}, time=${time}`
    );
    console.log(`🔍 Available reservations:`, reservations);

    const found = reservations.find(
      (res) =>
        res.tableId === tableId &&
        getTimeInMinutes(res.startTime) <= getTimeInMinutes(time) &&
        getTimeInMinutes(res.endTime) > getTimeInMinutes(time)
    );

    console.log(`🔍 Found reservation:`, found);
    return found;
  };

  // Rezervasyon kapasite kontrolü ve renk belirleme
  const getReservationStyle = (reservation: Reservation) => {
    const table = tables.find((t) => t.id === reservation.tableId);
    if (!table) {
      return {
        backgroundColor: "#f87171", // Kırmızı - masa bulunamadı
        borderColor: "#b91c1c",
        isWarning: true,
      };
    }

    const minCapacity = table.minCapacity || table.capacity || 1;
    const maxCapacity = table.maxCapacity || table.capacity || 10;
    const guestCount = reservation.guestCount || 0;

    // Kapasite kontrolü
    if (guestCount < minCapacity || guestCount > maxCapacity) {
      // Kahve tonları - kapasite uyarısı
      return {
        backgroundColor: "#cd853f", // Sandy brown - daha belirgin kahve
        borderColor: "#8b4513", // Saddle brown - koyu kahve
        isWarning: true,
      };
    }

    // Normal durum - yeşil
    return {
      backgroundColor: "#10b981", // Emerald-500
      borderColor: "#047857", // Emerald-700
      isWarning: false,
    };
  };

  // Handle card click - directly with reservation object
  const handleCardClick = (reservation: Reservation) => {
    console.log(`🎯 handleCardClick called with reservation:`, reservation);
    setEditingReservation(reservation);
    setFormValues({
      customerName: reservation.customerName,
      guestCount: reservation.guestCount,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      tableId: reservation.tableId,
      status: reservation.status,
      note: reservation.note || "",
    });
    setIsReservationModalOpen(true);
  };

  // Handle cell click
  const handleCellClick = (tableId: string, time: string) => {
    console.log(`🎯 handleCellClick called: tableId=${tableId}, time=${time}`);
    const existingReservation = getReservationAtTime(tableId, time);

    if (existingReservation) {
      console.log(
        `🎯 Found existing reservation, editing:`,
        existingReservation
      );
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
      console.log(`🎯 No existing reservation found, creating new one`);

      // timeSlots'tan bir sonraki saati bul
      const currentIndex = timeSlots.findIndex((slot) => slot === time);
      const nextIndex = currentIndex + 1;
      const endTime =
        nextIndex < timeSlots.length ? timeSlots[nextIndex] : timeSlots[0];

      console.log("🔧 Cell click - setting end time:", {
        startTime: time,
        currentIndex,
        nextIndex,
        endTime,
      });

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

  // Save reservation
  const handleSaveReservation = async () => {
    const activeRestaurant = selectedRestaurant || currentRestaurant;
    if (!activeRestaurant) {
      toast.error("Lütfen bir restoran seçin");
      return;
    }

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
        toast.error("Lütfen zorunlu alanları doldurun");
        return;
      }

      // Kişi sayısı kontrolü
      if (!guestCount || guestCount < 1) {
        toast.error("En az 1 kişi için rezervasyon yapılmalıdır");
        return;
      }

      // Masa kapasite kontrolü - sadece uyarı amaçlı, engelleme yok
      const selectedTable = tables.find((table) => table.id === tableId);
      if (selectedTable) {
        const minCapacity =
          selectedTable.minCapacity || selectedTable.capacity || 1;
        const maxCapacity =
          selectedTable.maxCapacity || selectedTable.capacity || 10;

        // Sadece bilgilendirme amaçlı uyarı, rezervasyon engellenmez
        if (guestCount < minCapacity || guestCount > maxCapacity) {
          toast.success(
            `Bu masa ${minCapacity}-${maxCapacity} kişi kapasiteli. Rezervasyon oluşturuldu ancak kapasite dışında olduğu için kahverengi renkte görünecek.`,
            { duration: 4000 }
          );
        }
      }

      const reservationDate = format(selectedDate, "yyyy-MM-dd");

      // Check for overlapping reservations
      const isOverlapping = reservations.some((res) => {
        if (editingReservation && res.id === editingReservation.id)
          return false;
        if (res.tableId !== tableId || res.date !== reservationDate)
          return false;

        const newStart = getTimeInMinutes(startTime);
        const newEnd = getTimeInMinutes(endTime);
        const resStart = getTimeInMinutes(res.startTime);
        const resEnd = getTimeInMinutes(res.endTime);

        return newStart < resEnd && newEnd > resStart;
      });

      if (isOverlapping) {
        toast.error("There's another reservation at this time slot");
        return;
      }

      const reservationData = {
        companyId:
          company?.id || activeRestaurant.companyId || "default-company",
        restaurantId: activeRestaurant.id,
        customerName,
        guestCount: Number(guestCount),
        startTime,
        endTime,
        tableId,
        status,
        note,
        date: reservationDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editingReservation) {
        const reservationRef = ref(db, `reservations/${editingReservation.id}`);
        await update(reservationRef, reservationData);
        toast.success("Reservation updated");
      } else {
        const newReservationRef = ref(db, "reservations");
        const newReservation = { ...reservationData };
        const newReservationKey = newReservation.tableId + "_" + Date.now();
        await set(ref(db, `reservations/${newReservationKey}`), newReservation);
        toast.success("Reservation created");
      }

      setIsReservationModalOpen(false);
    } catch (error) {
      console.error("Error saving reservation:", error);
      toast.error("Error saving reservation");
    }
  };

  // Delete reservation
  const handleDeleteReservation = async () => {
    if (!editingReservation) return;

    try {
      const reservationRef = ref(db, `reservations/${editingReservation.id}`);
      await remove(reservationRef);
      toast.success("Reservation deleted");
      setIsReservationModalOpen(false);
    } catch (error) {
      console.error("Error deleting reservation:", error);
      toast.error("Error deleting reservation");
    }
  };

  // Drag and drop handlers
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

      // Normalize fonksiyonu
      const normalize = (t: string) => {
        if (!t) return "";
        const [h, m] = t.split(":");
        const hours = parseInt(h || "0");
        const minutes = parseInt(m || "0");

        // 15 dakikalık periyotlara yuvarlama
        const roundedMinutes = Math.round(minutes / 15) * 15;
        const finalHours = roundedMinutes === 60 ? hours + 1 : hours;
        const finalMinutes = roundedMinutes === 60 ? 0 : roundedMinutes;

        return `${finalHours.toString().padStart(2, "0")}:${finalMinutes
          .toString()
          .padStart(2, "0")}`;
      };

      const startIndex = timeSlots.findIndex(
        (slot) => normalize(slot) === normalize(originalReservation.startTime)
      );
      const endIndex = timeSlots.findIndex(
        (slot) => normalize(slot) === normalize(originalReservation.endTime)
      );
      const duration = endIndex - startIndex;

      const newStartIndex = timeSlots.findIndex((slot) => slot === time);
      const newStartTime = time;
      const newEndIndex = Math.min(
        newStartIndex + duration,
        timeSlots.length - 1
      );
      const newEndTime = timeSlots[newEndIndex];

      // Check for overlaps
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
        toast.error("Bu saatte başka bir rezervasyon var");
        return;
      }

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
      console.error("Error moving reservation:", error);
      toast.error("Rezervasyon taşınırken hata oluştu");
    }
  };

  // Resize handlers
  const handleResizeStart = (
    e: React.MouseEvent,
    reservationId: string,
    direction: "start" | "end"
  ) => {
    e.stopPropagation();
    setResizingReservation({ id: reservationId, direction });

    const directionText = direction === "start" ? "başlangıç" : "bitiş";
    toast.success(
      `Rezervasyonun ${directionText} saatini değiştirmek için bir saate tıklayın`,
      {
        duration: 5000,
        position: "bottom-center",
        id: "resize-toast",
      }
    );
  };

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

      if (getTimeInMinutes(newStartTime) >= getTimeInMinutes(newEndTime)) {
        toast.error("Başlangıç saati bitiş saatinden önce olmalı", {
          id: "resize-error",
        });
        return;
      }

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
        toast.error("Bu saatte başka bir rezervasyon var", {
          id: "resize-error",
        });
        return;
      }

      const updatedReservation = {
        ...reservation,
        startTime: newStartTime,
        endTime: newEndTime,
      };

      const reservationRef = ref(db, `reservations/${reservation.id}`);
      await update(reservationRef, updatedReservation);

      toast.success("Rezervasyon saati güncellendi", {
        id: "resize-success",
      });
    } catch (error) {
      console.error("Error resizing reservation:", error);
      toast.error("Rezervasyon saati güncellenirken hata oluştu", {
        id: "resize-error",
      });
    } finally {
      setResizingReservation(null);
      setHoveredCell(null);
    }
  };

  const handleCancelResize = () => {
    setResizingReservation(null);
    setHoveredCell(null);
    toast.dismiss("resize-toast");
  };

  // Yeni sürükleyerek resize handler'ları
  const handleDragResizeStart = (
    e: React.MouseEvent,
    reservationId: string,
    direction: "start" | "end"
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const reservation = reservations.find((r) => r.id === reservationId);
    if (!reservation) return;

    setDragResizing({
      id: reservationId,
      direction,
      startX: e.clientX,
      originalStartTime: reservation.startTime,
      originalEndTime: reservation.endTime,
      tableId: reservation.tableId,
    });

    setDragResizePreview({
      startTime: reservation.startTime,
      endTime: reservation.endTime,
    });

    // Mouse event listeners
    const handleMouseMove = (e: MouseEvent) => {
      const currentDragState = dragResizing || {
        id: reservationId,
        direction,
        startX: e.clientX,
        originalStartTime: reservation.startTime,
        originalEndTime: reservation.endTime,
        tableId: reservation.tableId,
      };

      const deltaX = e.clientX - currentDragState.startX;
      const pixelsPer15Min = 37.5; // 150px / 4 = 37.5px per 15 minutes

      // 15 dakikalık adımları hesapla
      const steps15Min = Math.round(deltaX / pixelsPer15Min);
      const minutesDelta = steps15Min * 15;

      let newStartTime = currentDragState.originalStartTime;
      let newEndTime = currentDragState.originalEndTime;

      if (currentDragState.direction === "start") {
        const newStartMinutes =
          getTimeInMinutes(currentDragState.originalStartTime) + minutesDelta;
        newStartTime = formatTime(Math.max(0, newStartMinutes));

        // Başlangıç zamanı bitiş zamanından sonra olamaz
        if (getTimeInMinutes(newStartTime) >= getTimeInMinutes(newEndTime)) {
          newStartTime = formatTime(getTimeInMinutes(newEndTime) - 15);
        }
      } else {
        const newEndMinutes =
          getTimeInMinutes(currentDragState.originalEndTime) + minutesDelta;
        newEndTime = formatTime(
          Math.max(getTimeInMinutes(newStartTime) + 15, newEndMinutes)
        );

        // Bitiş zamanı başlangıç zamanından önce olamaz
        if (getTimeInMinutes(newEndTime) <= getTimeInMinutes(newStartTime)) {
          newEndTime = formatTime(getTimeInMinutes(newStartTime) + 15);
        }
      }

      setDragResizePreview({
        startTime: newStartTime,
        endTime: newEndTime,
      });

      // Resize edilen cell'i işaretle
      const currentTime =
        currentDragState.direction === "start" ? newStartTime : newEndTime;
      setResizeHoveredCell({
        tableId: currentDragState.tableId,
        time: currentTime,
      });
    };

    const handleMouseUp = async (e: MouseEvent) => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      if (!dragResizePreview) {
        setDragResizing(null);
        setDragResizePreview(null);
        setResizeHoveredCell(null);
        return;
      }

      const currentDragState = dragResizing || {
        id: reservationId,
        direction,
        startX: e.clientX,
        originalStartTime: reservation.startTime,
        originalEndTime: reservation.endTime,
        tableId: reservation.tableId,
      };

      // Değişiklik olup olmadığını kontrol et
      if (
        dragResizePreview.startTime === currentDragState.originalStartTime &&
        dragResizePreview.endTime === currentDragState.originalEndTime
      ) {
        setDragResizing(null);
        setDragResizePreview(null);
        setResizeHoveredCell(null);
        return;
      }

      try {
        const reservationToUpdate = reservations.find(
          (r) => r.id === reservationId
        );
        if (!reservationToUpdate) return;

        // Çakışma kontrolü
        const isOverlapping = reservations.some((res) => {
          if (res.id === reservationToUpdate.id) return false;
          if (res.tableId !== reservationToUpdate.tableId) return false;
          if (res.date !== reservationToUpdate.date) return false;

          const resStart = getTimeInMinutes(res.startTime);
          const resEnd = getTimeInMinutes(res.endTime);
          const newStart = getTimeInMinutes(dragResizePreview.startTime);
          const newEnd = getTimeInMinutes(dragResizePreview.endTime);

          return newStart < resEnd && newEnd > resStart;
        });

        if (isOverlapping) {
          toast.error("Bu saatte başka bir rezervasyon var");
          return;
        }

        // Firebase güncelleme
        const updatedReservation = {
          ...reservationToUpdate,
          startTime: dragResizePreview.startTime,
          endTime: dragResizePreview.endTime,
        };

        const reservationRef = ref(
          db,
          `reservations/${reservationToUpdate.id}`
        );
        await update(reservationRef, updatedReservation);

        toast.success("Rezervasyon saati güncellendi");
      } catch (error) {
        console.error("Resize error:", error);
        toast.error("Güncelleme hatası");
      } finally {
        setDragResizing(null);
        setDragResizePreview(null);
        setResizeHoveredCell(null);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Keyboard event listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (dragResizing) {
          setDragResizing(null);
          setDragResizePreview(null);
          setResizeHoveredCell(null);
        } else if (resizingReservation) {
          handleCancelResize();
        }
      }

      if (isReservationModalOpen) {
        if (e.key === "Enter") {
          e.preventDefault();
          handleSaveReservation();
        } else if (e.key === "Escape") {
          e.preventDefault();
          setIsReservationModalOpen(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [resizingReservation, isReservationModalOpen]);

  // reservations dizisini konsola yazdır
  useEffect(() => {
    if (typeof window !== "undefined") {
    }
  }, [reservations]);

  // Scroll senkronizasyonu
  const handleTimeHeaderScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollLeft = scrollLeft;
    }
  };

  const handleMainScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    if (timeHeaderRef.current) {
      timeHeaderRef.current.scrollLeft = scrollLeft;
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Çıkış yaparken hata oluştu");
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 text-gray-800">
      <AdminHeader title="📅 Rezervasyon Yönetimi">
        {/* Date Controls */}
        <div className="flex justify-between items-center">
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

                {/* DatePicker */}
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
                  endTime: "20:00",
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
      </AdminHeader>

      {/* Main content - Reservation area */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400"></div>
            </div>
          ) : (
            <div className="flex flex-col space-y-4">
              {/* Table status summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Total Tables
                  </h3>
                  <p className="text-2xl font-bold">{flatTablesList.length}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Confirmed Reservations
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
                    Pending Reservations
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
                    Cancelled
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

              {/* Reservation table */}
              <div className="bg-white text-gray-800 rounded-lg shadow overflow-hidden">
                {/* Top section - Time headers */}
                <div className="sticky top-0 z-30 bg-red-500 flex border-b border-gray-200">
                  {/* Sol sabit header */}
                  <div className="min-w-[130px] py-2 px-3 text-left text-xs font-medium uppercase tracking-wider bg-red-500 border-r border-gray-200 flex justify-between items-center z-40">
                    <span>🍕 Table </span>
                    <span className="text-white">›</span>
                  </div>

                  {/* Sağ scroll edilebilir time slots */}
                  <div
                    ref={timeHeaderRef}
                    className="flex-1 overflow-x-auto scrollbar-hide"
                    onScroll={handleTimeHeaderScroll}
                  >
                    <div
                      className="flex"
                      style={{ minWidth: `${timeSlots.length * 150}px` }}
                    >
                      {timeSlots.map((time) => (
                        <div
                          key={time}
                          className="min-w-[150px] py-2 px-1 text-center text-xs font-medium text-white uppercase tracking-wider border-r border-gray-200 bg-red-500 flex-shrink-0 relative"
                        >
                          {time}
                          {/* Drag veya resize sırasında 15 dakikalık alt bölümler */}
                          {(draggingReservation || dragResizing) && (
                            <div className="absolute bottom-0 left-0 right-0 flex opacity-60">
                              <div className="flex-1 border-r border-white/20 text-[8px] text-center py-0.5">
                                15
                              </div>
                              <div className="flex-1 border-r border-white/20 text-[8px] text-center py-0.5">
                                30
                              </div>
                              <div className="flex-1 border-r border-white/20 text-[8px] text-center py-0.5">
                                45
                              </div>
                              <div className="flex-1 text-[8px] text-center py-0.5">
                                00
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Cancel resize button */}
                {resizingReservation && (
                  <div className="absolute top-2 right-2 z-50">
                    <button
                      className="bg-red-500 text-white px-2 py-1 rounded text-xs flex items-center shadow-lg"
                      onClick={handleCancelResize}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </button>
                  </div>
                )}

                {/* Main content - Sol sabit, sağ scroll */}
                <div className="flex">
                  {/* Sol sabit panel - Kategoriler ve masa isimleri */}
                  <div className="min-w-[130px] bg-white z-20 border-r border-gray-200">
                    {Object.entries(groupedByCategoryTables).map(
                      ([categoryId, { category, tables }]) => (
                        <div key={categoryId} className="category-group">
                          {/* Category header - Sol kısım */}
                          <div
                            className="h-[42px] px-3 py-2 font-medium text-white uppercase tracking-wider text-sm border-b border-gray-200 flex items-center"
                            style={{
                              backgroundColor: category.color,
                            }}
                          >
                            {category.name}
                          </div>

                          {/* Tables in this category - Sol kısım */}
                          {tables.map((table, tableIndex) => {
                            const tableReservations = reservations.filter(
                              (r) => r.tableId === table.id
                            );
                            const hasActiveReservation =
                              tableReservations.length > 0;

                            const capacityText =
                              table.capacity === 1
                                ? "1 - 1"
                                : `${Math.max(1, table.capacity - 1)} - ${
                                    table.capacity
                                  }`;

                            return (
                              <div
                                className={`h-[30px] py-1 px-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 bg-white border-b border-gray-200 ${
                                  formValues.tableId === table.id
                                    ? "bg-blue-50"
                                    : ""
                                }`}
                                key={table.id}
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
                            );
                          })}
                        </div>
                      )
                    )}
                  </div>

                  {/* Sağ scroll edilebilir grid panel */}
                  <div
                    ref={mainScrollRef}
                    className="flex-1 overflow-x-auto scrollbar-hide relative"
                    onScroll={handleMainScroll}
                  >
                    {/* Current time indicator */}
                    <div
                      className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-30 pointer-events-none"
                      style={{
                        left: `${(() => {
                          const now = new Date();
                          const hour = now.getHours();
                          const minute = now.getMinutes();
                          const currentMinutes = hour * 60 + minute;
                          const baseMinutes = 7 * 60; // 07:00
                          const relativeMinutes = currentMinutes - baseMinutes;

                          // Eğer saat 07:00'dan önce ise (gece saatleri), ertesi güne ekle
                          if (hour < 7) {
                            const adjustedMinutes = (hour + 24) * 60 + minute;
                            const adjustedRelative =
                              adjustedMinutes - baseMinutes;
                            return (adjustedRelative / 60) * 150; // Her saat 150px
                          }

                          return (relativeMinutes / 60) * 150; // Her saat 150px
                        })()}px`,
                      }}
                    ></div>

                    {/* Grid container */}
                    <div style={{ minWidth: `${timeSlots.length * 150}px` }}>
                      {Object.entries(groupedByCategoryTables).map(
                        ([categoryId, { category, tables }]) => (
                          <div key={categoryId} className="category-group">
                            {/* Category header - Sağ kısım */}
                            <div
                              className="h-[42px] border-b border-gray-200 flex items-center"
                              style={{
                                backgroundColor: category.color,
                                minWidth: `${timeSlots.length * 150}px`,
                              }}
                            >
                              <div className="px-3 py-2 font-medium text-white uppercase tracking-wider text-sm">
                                &nbsp;
                              </div>
                            </div>

                            {/* Tables in this category - Grid cells */}
                            {tables.map((table, tableIndex) => (
                              <div
                                className="flex border-b border-gray-200 h-[30px]"
                                key={table.id}
                                style={{
                                  minWidth: `${timeSlots.length * 150}px`,
                                }}
                              >
                                {/* Grid cells */}
                                {timeSlots.map((time, timeIndex) => (
                                  <div
                                    key={`${table.id}-${time}`}
                                    className={`min-w-[150px] h-[30px] border-[0.5px] border-gray-200 relative cursor-pointer flex-shrink-0 ${
                                      timeIndex % 2 === 0
                                        ? "bg-gray-50"
                                        : "bg-white"
                                    } ${
                                      resizingReservation
                                        ? "hover:bg-blue-100"
                                        : "hover:bg-gray-100"
                                    }`}
                                    data-table-id={table.id}
                                    data-time={time}
                                    onDragOver={(e) =>
                                      handleDragOver(e, table.id, time)
                                    }
                                    onDrop={(e) =>
                                      handleDrop(e, table.id, time)
                                    }
                                    onMouseEnter={() => {
                                      if (draggingReservation) {
                                        setHoveredCell({
                                          tableId: table.id,
                                          time: time,
                                        });
                                      }
                                    }}
                                    onMouseLeave={() => {
                                      if (draggingReservation) {
                                        setHoveredCell(null);
                                      }
                                    }}
                                    onClick={() => {
                                      if (resizingReservation) {
                                        handleResizeEnd(time);
                                      } else {
                                        handleCellClick(table.id, time);
                                      }
                                    }}
                                  >
                                    {/* Kart taşıma veya resize sırasında sub-slots göster */}
                                    {((draggingReservation &&
                                      hoveredCell?.tableId === table.id) ||
                                      (resizeHoveredCell?.tableId ===
                                        table.id &&
                                        resizeHoveredCell?.time === time)) && (
                                      <div className="absolute inset-0 flex">
                                        {/* 15 dakika */}
                                        <div
                                          className="flex-1 border-r border-cyan-200 bg-cyan-50 hover:bg-cyan-100 cursor-pointer flex items-center justify-center transition-colors opacity-40"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const [hour] = time.split(":");
                                            const subTime = `${hour}:15`;
                                            if (draggingReservation) {
                                              handleDrop(
                                                e as any,
                                                table.id,
                                                subTime
                                              );
                                            }
                                          }}
                                        >
                                          <span className="text-xs text-cyan-700 font-medium opacity-80">
                                            :15
                                          </span>
                                        </div>
                                        {/* 30 dakika */}
                                        <div
                                          className="flex-1 border-r border-cyan-200 bg-cyan-50 hover:bg-cyan-100 cursor-pointer flex items-center justify-center transition-colors opacity-40"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const [hour] = time.split(":");
                                            const subTime = `${hour}:30`;
                                            if (draggingReservation) {
                                              handleDrop(
                                                e as any,
                                                table.id,
                                                subTime
                                              );
                                            }
                                          }}
                                        >
                                          <span className="text-xs text-cyan-700 font-medium opacity-80">
                                            :30
                                          </span>
                                        </div>
                                        {/* 45 dakika */}
                                        <div
                                          className="flex-1 border-r border-cyan-200 bg-cyan-50 hover:bg-cyan-100 cursor-pointer flex items-center justify-center transition-colors opacity-40"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const [hour] = time.split(":");
                                            const subTime = `${hour}:45`;
                                            if (draggingReservation) {
                                              handleDrop(
                                                e as any,
                                                table.id,
                                                subTime
                                              );
                                            }
                                          }}
                                        >
                                          <span className="text-xs text-cyan-700 font-medium opacity-80">
                                            :45
                                          </span>
                                        </div>
                                        {/* 00 dakika (bir sonraki saat) */}
                                        <div
                                          className="flex-1 bg-cyan-50 hover:bg-cyan-100 cursor-pointer flex items-center justify-center transition-colors opacity-40"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const [hour] = time.split(":");
                                            const nextHour = (
                                              parseInt(hour) + 1
                                            )
                                              .toString()
                                              .padStart(2, "0");
                                            const subTime = `${nextHour}:00`;
                                            if (draggingReservation) {
                                              handleDrop(
                                                e as any,
                                                table.id,
                                                subTime
                                              );
                                            }
                                          }}
                                        >
                                          <span className="text-xs text-cyan-700 font-medium opacity-80">
                                            :00
                                          </span>
                                        </div>
                                      </div>
                                    )}

                                    {/* Reservations - Only render in the starting time slot */}
                                    {timeIndex === 0 && (
                                      <div className="absolute inset-0 pointer-events-none">
                                        {reservations
                                          .filter(
                                            (reservation) =>
                                              `${reservation.tableId}` ===
                                                `${table.id}` &&
                                              reservation.date ===
                                                format(
                                                  selectedDate,
                                                  "yyyy-MM-dd"
                                                )
                                          )
                                          .map((reservation) => {
                                            const normalize = (t: string) => {
                                              if (!t) return "";
                                              const [h, m] = t.split(":");
                                              const hours = parseInt(h || "0");
                                              const minutes = parseInt(
                                                m || "0"
                                              );

                                              // 15 dakikalık periyotlara yuvarlama
                                              const roundedMinutes =
                                                Math.round(minutes / 15) * 15;
                                              const finalHours =
                                                roundedMinutes === 60
                                                  ? hours + 1
                                                  : hours;
                                              const finalMinutes =
                                                roundedMinutes === 60
                                                  ? 0
                                                  : roundedMinutes;

                                              return `${finalHours
                                                .toString()
                                                .padStart(
                                                  2,
                                                  "0"
                                                )}:${finalMinutes
                                                .toString()
                                                .padStart(2, "0")}`;
                                            };

                                            const normalizeForEndTime = (
                                              t: string
                                            ) => {
                                              if (!t) return "";
                                              const [h, m] = t.split(":");
                                              const hours = parseInt(h || "0");
                                              const minutes = parseInt(
                                                m || "0"
                                              );

                                              // Bitiş zamanı için: eğer dakika varsa bir sonraki saate yuvarla
                                              if (minutes > 0) {
                                                return `${(hours + 1)
                                                  .toString()
                                                  .padStart(2, "0")}:00`;
                                              }
                                              return `${hours
                                                .toString()
                                                .padStart(2, "0")}:00`;
                                            };

                                            // Drag resize preview varsa onları kullan, yoksa orijinal değerleri
                                            const displayStartTime =
                                              dragResizing?.id ===
                                                reservation.id &&
                                              dragResizePreview
                                                ? dragResizePreview.startTime
                                                : reservation.startTime;
                                            const displayEndTime =
                                              dragResizing?.id ===
                                                reservation.id &&
                                              dragResizePreview
                                                ? dragResizePreview.endTime
                                                : reservation.endTime;

                                            // Pozisyon hesaplaması
                                            const startIdx =
                                              timeSlots.findIndex(
                                                (slot) =>
                                                  normalize(slot) ===
                                                  normalize(displayStartTime)
                                              );
                                            const endIdx = timeSlots.findIndex(
                                              (slot) =>
                                                normalize(slot) ===
                                                normalizeForEndTime(
                                                  displayEndTime
                                                )
                                            );

                                            console.log(
                                              `🎯 Debug Card: ${reservation.customerName} (${reservation.id})`
                                            );
                                            console.log(
                                              `🎯 Raw times: ${displayStartTime} - ${displayEndTime}`
                                            );
                                            console.log(
                                              `🎯 Normalized times: ${normalize(
                                                displayStartTime
                                              )} - ${normalizeForEndTime(
                                                displayEndTime
                                              )}`
                                            );
                                            console.log(
                                              `🎯 TimeSlots indices: start=${startIdx}, end=${endIdx}`
                                            );
                                            console.log(
                                              `🎯 TimeSlots length: ${timeSlots.length}`
                                            );

                                            if (
                                              startIdx === -1 ||
                                              endIdx === -1 ||
                                              endIdx <= startIdx
                                            ) {
                                              console.log(
                                                `🎯 Card not rendered: startIdx=${startIdx}, endIdx=${endIdx}`
                                              );
                                              return null;
                                            }

                                            // Güvenli pozisyon hesaplaması
                                            const leftPosition = Math.max(
                                              0,
                                              startIdx * 150
                                            );
                                            const widthCalculation = Math.max(
                                              50,
                                              (endIdx - startIdx) * 150 - 2
                                            );

                                            // Rezervasyon stilini al
                                            const reservationStyle =
                                              getReservationStyle(reservation);

                                            return (
                                              <div
                                                key={`${reservation.id}-${table.id}`}
                                                className={`absolute rounded-lg pointer-events-auto overflow-hidden shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-102 ${
                                                  draggingReservation?.id ===
                                                  reservation.id
                                                    ? "opacity-50 cursor-grabbing"
                                                    : dragResizing?.id ===
                                                      reservation.id
                                                    ? "ring-2 ring-cyan-400 ring-opacity-75 cursor-pointer opacity-80"
                                                    : resizingReservation?.id ===
                                                      reservation.id
                                                    ? "ring-2 ring-blue-400 ring-opacity-75 cursor-pointer"
                                                    : "cursor-grab"
                                                } ${
                                                  reservationStyle.isWarning
                                                    ? "ring-2 ring-yellow-400"
                                                    : ""
                                                }`}
                                                style={{
                                                  left: `${leftPosition}px`,
                                                  width: `${widthCalculation}px`,
                                                  height: "26px",
                                                  top: "2px",
                                                  backgroundColor:
                                                    reservationStyle.backgroundColor,
                                                  borderColor:
                                                    reservationStyle.borderColor,
                                                  minWidth: "50px",
                                                  touchAction: "none",
                                                  backdropFilter: "blur(4px)",
                                                  boxShadow:
                                                    reservationStyle.isWarning
                                                      ? "0 4px 6px -1px rgba(139, 69, 19, 0.3), 0 2px 4px -1px rgba(139, 69, 19, 0.2)"
                                                      : "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                                                  zIndex: 10,
                                                }}
                                                draggable={
                                                  !resizingReservation &&
                                                  !dragResizing
                                                }
                                                onDragStart={(e) => {
                                                  if (
                                                    resizingReservation ||
                                                    dragResizing
                                                  ) {
                                                    e.preventDefault();
                                                    return;
                                                  }
                                                  handleDragStart(reservation);
                                                }}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleCardClick(reservation);
                                                }}
                                              >
                                                {/* Modern gradient overlay */}
                                                <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent pointer-events-none" />

                                                {/* Ana içerik */}
                                                <div className="relative z-10 h-full flex flex-col justify-center px-3 py-1">
                                                  {/* Kompakt gösterim */}
                                                  <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                      <div className="w-2 h-2 rounded-full bg-white/80 flex-shrink-0" />
                                                      <div className="font-semibold text-white text-xs truncate">
                                                        {reservation.customerName ||
                                                          "İsimsiz"}
                                                      </div>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                      <span className="bg-white/20 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-white font-medium">
                                                        {reservation.guestCount}
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>

                                                {/* Sürükleme göstergesi */}
                                                <div className="absolute top-1 right-1 w-2 h-2 bg-white/30 rounded-full pointer-events-none" />

                                                {/* Resize handle'ları - sadece resize aktif değilken */}
                                                {!dragResizing && (
                                                  <>
                                                    {/* Sol resize handle (başlangıç zamanı) */}
                                                    <div
                                                      className="absolute left-0 top-0 bottom-0 w-4 cursor-ew-resize hover:bg-white/40 transition-colors group z-20"
                                                      onMouseDown={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        handleDragResizeStart(
                                                          e,
                                                          reservation.id,
                                                          "start"
                                                        );
                                                      }}
                                                      onDragStart={(e) =>
                                                        e.preventDefault()
                                                      }
                                                      title="Başlangıç zamanını değiştir"
                                                    >
                                                      <div className="absolute left-0.5 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white/80 rounded-full group-hover:bg-white transition-colors shadow-sm" />
                                                    </div>

                                                    {/* Sağ resize handle (bitiş zamanı) */}
                                                    <div
                                                      className="absolute right-0 top-0 bottom-0 w-4 cursor-ew-resize hover:bg-white/40 transition-colors group z-20"
                                                      onMouseDown={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        handleDragResizeStart(
                                                          e,
                                                          reservation.id,
                                                          "end"
                                                        );
                                                      }}
                                                      onDragStart={(e) =>
                                                        e.preventDefault()
                                                      }
                                                      title="Bitiş zamanını değiştir"
                                                    >
                                                      <div className="absolute right-0.5 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white/80 rounded-full group-hover:bg-white transition-colors shadow-sm" />
                                                    </div>
                                                  </>
                                                )}
                                              </div>
                                            );
                                          })}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {flatTablesList.length === 0 && (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <p className="text-gray-500 mb-4">No tables found.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Reservation Modal */}
      {isReservationModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {editingReservation ? "Edit Reservation" : "New Reservation"}
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
                  Customer Name
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
                  placeholder="Customer name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kişi Sayısı *
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Kaç kişi?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={formValues.guestCount || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormValues({
                        ...formValues,
                        guestCount: value === "" ? 0 : parseInt(value) || 0,
                      });
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    En az 1 kişi gerekli. Masa kapasitesi dışında rezervasyon
                    yapılabilir ancak kahverengi renkte görünür.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Table
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={formValues.tableId}
                    onChange={(e) =>
                      setFormValues({ ...formValues, tableId: e.target.value })
                    }
                  >
                    <option value="">Select Table</option>
                    {tables.map((table) => {
                      const category = categories.find(
                        (c) => c.id === table.categoryId
                      );
                      const minCapacity =
                        table.minCapacity || table.capacity || 1;
                      const maxCapacity =
                        table.maxCapacity || table.capacity || 10;
                      return (
                        <option key={table.id} value={table.id}>
                          Table {table.number} -{" "}
                          {category?.name || "No Category"}({minCapacity}-
                          {maxCapacity} kişi)
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={formValues.startTime}
                    onChange={(e) => {
                      const newStartTime = e.target.value;

                      // timeSlots'tan bir sonraki saati bul
                      const currentIndex = timeSlots.findIndex(
                        (slot) => slot === newStartTime
                      );
                      const nextIndex = currentIndex + 1;
                      const newEndTime =
                        nextIndex < timeSlots.length
                          ? timeSlots[nextIndex]
                          : timeSlots[0];

                      console.log("🔧 Start time changed:", {
                        newStartTime,
                        currentIndex,
                        nextIndex,
                        newEndTime,
                        timeSlots: timeSlots.slice(0, 5), // İlk 5 slot'u göster
                      });

                      setFormValues({
                        ...formValues,
                        startTime: newStartTime,
                        endTime: newEndTime,
                      });
                    }}
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
                    End Time
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={formValues.endTime}
                    onChange={(e) =>
                      setFormValues({ ...formValues, endTime: e.target.value })
                    }
                  >
                    {timeSlots.map((time) => {
                      const isDisabled =
                        getTimeInMinutes(time) <=
                        getTimeInMinutes(formValues.startTime || "19:00");
                      if (time === formValues.endTime) {
                        console.log("🔧 End time option check:", {
                          time,
                          formValuesStartTime: formValues.startTime,
                          formValuesEndTime: formValues.endTime,
                          isDisabled,
                          startTimeMinutes: getTimeInMinutes(
                            formValues.startTime || "19:00"
                          ),
                          endTimeMinutes: getTimeInMinutes(time),
                        });
                      }
                      return (
                        <option
                          key={`end-${time}`}
                          value={time}
                          disabled={isDisabled}
                        >
                          {time}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
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
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={formValues.note}
                  onChange={(e) =>
                    setFormValues({ ...formValues, note: e.target.value })
                  }
                  rows={3}
                  placeholder="Add a note about the reservation"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end space-x-3">
              {editingReservation && (
                <button
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  onClick={handleDeleteReservation}
                >
                  Delete
                </button>
              )}
              <button
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                onClick={() => setIsReservationModalOpen(false)}
              >
                Cancel (Esc)
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                onClick={handleSaveReservation}
              >
                Save (Enter)
              </button>
            </div>

            {/* Shortcut info */}
            <div className="px-4 pb-4 text-center">
              <p className="text-xs text-gray-500">
                💡 <strong>Enter</strong> to save, <strong>Esc</strong> to
                cancel
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
