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
  User,
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
import StaffAssignmentModal from "./StaffAssignmentModal";
import TableStaffInfoModal from "./TableStaffInfoModal";

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
  customerType: "individual" | "company" | "walkin";
  customerName: string;
  customerSurname: string;
  customerGender: "bay" | "bayan" | "";
  customerEmail: string;
  customerPhone: string;
  companyName: string;
  guestCount: number;
  startTime: string;
  endTime: string;
  status: "confirmed" | "pending" | "cancelled";
  arrivalStatus: "waiting" | "arrived" | "departed";
  note: string;
  date: string;
  createdAt?: string;
  updatedAt?: string;
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

  // Staff Assignment Modal
  const [showStaffModal, setShowStaffModal] = useState(false);

  // Staff assignments ve info modal için state'ler
  const [staffAssignments, setStaffAssignments] = useState<Record<string, any>>(
    {}
  );
  const [selectedTableForStaffInfo, setSelectedTableForStaffInfo] = useState<
    string | null
  >(null);
  const [staffInfoModalOpen, setStaffInfoModalOpen] = useState(false);
  const [restaurantSettings, setRestaurantSettings] = useState<any>(null);
  const [waitersData, setWaitersData] = useState<any[]>([]);

  // Customer autocomplete states
  const [customers, setCustomers] = useState<any[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [activeSearchField, setActiveSearchField] = useState<string>("");

  // Refs
  const calendarRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const timeHeaderRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);

  // Form values
  const [formValues, setFormValues] = useState<Partial<Reservation>>({
    customerType: "walkin",
    customerName: "",
    customerSurname: "",
    customerGender: "",
    customerEmail: "",
    customerPhone: "",
    companyName: "",
    guestCount: 2,
    tableId: "",
    startTime: "19:00",
    endTime: "20:00",
    status: "confirmed",
    arrivalStatus: "waiting",
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
                customerType: data.customerType || "walkin",
                customerName: data.customerName || "",
                customerSurname: data.customerSurname || "",
                customerGender: data.customerGender || "",
                customerEmail: data.customerEmail || "",
                customerPhone: data.customerPhone || "",
                companyName: data.companyName || "",
                guestCount: data.guestCount || 1,
                startTime: data.startTime,
                endTime: data.endTime,
                status: data.status || "confirmed",
                arrivalStatus: data.arrivalStatus || "waiting",
                note: data.note || "",
                date: data.date || format(new Date(), "yyyy-MM-dd"),
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
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

  // Staff assignments ve waiter verilerini yükle
  useEffect(() => {
    const loadStaffData = async () => {
      if (!currentRestaurant) return;

      try {
        // Waiters/staff verilerini yükle
        const waitersRef = ref(db, "waiters");
        const waitersSnapshot = await get(waitersRef);

        if (waitersSnapshot.exists()) {
          const waitersData = waitersSnapshot.val();
          const loadedWaiters = Object.entries(waitersData)
            .filter(
              ([_, waiter]: [string, any]) =>
                waiter.restaurantId === currentRestaurant.id
            )
            .map(([id, waiter]: [string, any]) => ({
              id,
              ...waiter,
            }));

          setWaitersData(loadedWaiters);
        }

        // Bugünkü staff assignments'ları yükle
        const todayStr = format(selectedDate, "yyyy-MM-dd");
        const assignmentsRef = ref(
          db,
          `assignments/${currentRestaurant.id}/${todayStr}`
        );
        const assignmentsSnapshot = await get(assignmentsRef);

        if (assignmentsSnapshot.exists()) {
          setStaffAssignments(assignmentsSnapshot.val());
        } else {
          setStaffAssignments({});
        }
      } catch (error) {
        console.error("Staff data loading error:", error);
      }
    };

    loadStaffData();
  }, [currentRestaurant, selectedDate]);

  // Restaurant ayarlarını yükle
  useEffect(() => {
    const loadRestaurantSettings = async () => {
      if (!currentRestaurant?.id) return;

      try {
        const settingsRef = ref(db, `restaurants/${currentRestaurant.id}`);
        const settingsSnapshot = await get(settingsRef);

        if (settingsSnapshot.exists()) {
          const settings = settingsSnapshot.val();
          console.log(
            "🎯 RESERVATION DEBUG - Restaurant settings loaded:",
            settings
          );
          setRestaurantSettings(settings);
        } else {
          console.log(
            "⚠️ No restaurant settings found for:",
            currentRestaurant.id
          );
        }
      } catch (error) {
        console.error("Restaurant settings loading error:", error);
      }
    };

    loadRestaurantSettings();
  }, [currentRestaurant]);

  // Load customers for autocomplete
  useEffect(() => {
    const loadCustomers = async () => {
      if (!currentRestaurant?.id) return;

      try {
        setLoadingCustomers(true);
        const customersRef = ref(db, "customers");
        const customersSnapshot = await get(customersRef);

        if (customersSnapshot.exists()) {
          const customersData = customersSnapshot.val();
          const loadedCustomers = Object.entries(customersData)
            .filter(
              ([_, customer]: [string, any]) =>
                customer.restaurantId === currentRestaurant.id
            )
            .map(([id, customer]: [string, any]) => ({
              id,
              ...customer,
            }));

          setCustomers(loadedCustomers);
          console.log(
            "📋 Customers loaded:",
            loadedCustomers.length,
            "customers"
          );
        } else {
          console.log("📋 No customers found in Firebase");
        }
      } catch (error) {
        console.error("Customers loading error:", error);
      } finally {
        setLoadingCustomers(false);
      }
    };

    loadCustomers();
  }, [currentRestaurant]);

  // Customer autocomplete functions
  const filterCustomers = (searchTerm: string, searchField: string = "all") => {
    if (!searchTerm.trim()) {
      setFilteredCustomers([]);
      setShowCustomerSuggestions(false);
      return;
    }

    const searchTermLower = searchTerm.toLowerCase();
    const filtered = customers.filter((customer) => {
      switch (searchField) {
        case "name":
          return customer.name?.toLowerCase().includes(searchTermLower);
        case "surname":
          return customer.surname?.toLowerCase().includes(searchTermLower);
        case "email":
          return customer.email?.toLowerCase().includes(searchTermLower);
        case "phone":
          return customer.phone?.includes(searchTerm);
        case "company":
          return customer.companyName?.toLowerCase().includes(searchTermLower);
        default: // "all"
          return (
            customer.name?.toLowerCase().includes(searchTermLower) ||
            customer.surname?.toLowerCase().includes(searchTermLower) ||
            customer.email?.toLowerCase().includes(searchTermLower) ||
            customer.phone?.includes(searchTerm) ||
            customer.companyName?.toLowerCase().includes(searchTermLower)
          );
      }
    });

    setFilteredCustomers(filtered.slice(0, 5)); // Show max 5 suggestions
    setShowCustomerSuggestions(filtered.length > 0);
  };

  const selectCustomer = (customer: any) => {
    setFormValues({
      ...formValues,
      customerType:
        customer.customerType ||
        ((customer.companyName ? "company" : "individual") as
          | "individual"
          | "company"
          | "walkin"),
      customerName: customer.name || "",
      customerSurname: customer.surname || "",
      customerGender: customer.gender || "",
      customerEmail: customer.email || "",
      customerPhone: customer.phone || "",
      companyName: customer.companyName || "",
    });
    setShowCustomerSuggestions(false);
    setActiveSearchField("");

    // Suggest table based on customer's previous reservations
    suggestTableForCustomer(customer);
  };

  // Function to suggest table based on customer history
  const suggestTableForCustomer = async (customer: any) => {
    try {
      const customerIdentifier = customer.email || customer.phone;
      if (!customerIdentifier) return;

      // Load all reservations for this customer
      const reservationsRef = ref(db, "reservations");
      const snapshot = await get(reservationsRef);

      if (snapshot.exists()) {
        const allReservations = snapshot.val();
        const customerReservations = Object.values(allReservations).filter(
          (res: any) =>
            res.customerEmail === customer.email ||
            res.customerPhone === customer.phone
        );

        if (customerReservations.length > 0) {
          // Find the most frequently used table
          const tableUsage: { [tableId: string]: number } = {};
          customerReservations.forEach((res: any) => {
            tableUsage[res.tableId] = (tableUsage[res.tableId] || 0) + 1;
          });

          // Get the most used table
          const mostUsedTableId = Object.keys(tableUsage).reduce((a, b) =>
            tableUsage[a] > tableUsage[b] ? a : b
          );

          const suggestedTable = tables.find((t) => t.id === mostUsedTableId);
          if (suggestedTable) {
            // Update form with suggested table
            setFormValues((prev) => ({
              ...prev,
              tableId: mostUsedTableId,
            }));

            // Show notification
            toast.success(
              `💡 Masa önerisi: ${customer.name} daha önce Masa ${suggestedTable.number}'de oturmuş`,
              { duration: 4000 }
            );
          }
        }
      }
    } catch (error) {
      console.error("Error suggesting table:", error);
    }
  };

  const handleCustomerFieldChange = (field: string, value: string) => {
    setFormValues({
      ...formValues,
      [field]: value,
    });

    // Set active search field and trigger autocomplete for different fields
    setActiveSearchField(field);

    if (field === "customerName") {
      filterCustomers(value, "name");
    } else if (field === "customerSurname") {
      filterCustomers(value, "surname");
    } else if (field === "customerEmail") {
      filterCustomers(value, "email");
    } else if (field === "customerPhone") {
      filterCustomers(value, "phone");
    } else if (field === "companyName") {
      filterCustomers(value, "company");
    }

    // Clear suggestions if field is empty
    if (!value.trim()) {
      setShowCustomerSuggestions(false);
      setActiveSearchField("");
    }
  };

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

    // First check arrival status for color priority
    switch (reservation.arrivalStatus) {
      case "arrived":
        return {
          backgroundColor: "#ff69b4", // Bright hot pink for arrived customers
          borderColor: "#e91e63",
          isWarning: false,
        };
      case "departed":
        return {
          backgroundColor: "#9ca3af", // Gray tone for departed customers
          borderColor: "#6b7280",
          isWarning: false,
        };
      default: // "waiting"
        break;
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
      customerType: reservation.customerType,
      customerName: reservation.customerName,
      customerSurname: reservation.customerSurname || "",
      customerGender: reservation.customerGender || "",
      customerEmail: reservation.customerEmail || "",
      customerPhone: reservation.customerPhone || "",
      companyName: reservation.companyName || "",
      guestCount: reservation.guestCount,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      tableId: reservation.tableId,
      status: reservation.status,
      arrivalStatus: reservation.arrivalStatus || "waiting",
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
        customerType: existingReservation.customerType,
        customerName: existingReservation.customerName,
        customerSurname: existingReservation.customerSurname || "",
        customerGender: existingReservation.customerGender || "",
        customerEmail: existingReservation.customerEmail || "",
        customerPhone: existingReservation.customerPhone || "",
        companyName: existingReservation.companyName || "",
        guestCount: existingReservation.guestCount,
        startTime: existingReservation.startTime,
        endTime: existingReservation.endTime,
        tableId: existingReservation.tableId,
        status: existingReservation.status,
        arrivalStatus: existingReservation.arrivalStatus || "waiting",
        note: existingReservation.note || "",
      });
    } else {
      console.log(`🎯 No existing reservation found, creating new one`);

      // Restaurant ayarlarından default süreyi al (dakika cinsinden)
      const defaultDurationMinutes =
        restaurantSettings?.settings?.reservationDuration ||
        restaurantSettings?.reservationDuration ||
        120;

      // Seçilen saati parse et
      const [startHour, startMinute] = time.split(":").map(Number);

      // Bitiş saatini hesapla
      const endTimeMinutes =
        startHour * 60 + startMinute + defaultDurationMinutes;
      const endHour = Math.floor(endTimeMinutes / 60) % 24;
      const endMinute = endTimeMinutes % 60;
      const endTime = `${endHour.toString().padStart(2, "0")}:${endMinute
        .toString()
        .padStart(2, "0")}`;

      console.log("🎯 RESERVATION DEBUG - Cell click duration:", {
        startTime: time,
        defaultDurationMinutes,
        calculatedEndTime: endTime,
        restaurantSettings,
      });

      setEditingReservation(null);
      setFormValues({
        customerType: "walkin",
        customerName: "",
        customerSurname: "",
        customerGender: "",
        customerEmail: "",
        customerPhone: "",
        companyName: "",
        guestCount: 2,
        startTime: time,
        endTime: endTime,
        tableId: tableId,
        status: "confirmed",
        arrivalStatus: "waiting",
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
        customerType,
        customerName,
        customerSurname,
        customerGender,
        customerEmail,
        customerPhone,
        companyName,
        guestCount,
        startTime,
        endTime,
        tableId,
        status,
        arrivalStatus,
        note,
      } = formValues;

      // Walk-in müşteriler için ad zorunlu değil
      if (customerType !== "walkin" && !customerName) {
        toast.error("Lütfen müşteri adını girin");
        return;
      }

      if (!tableId || !startTime || !endTime) {
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
        customerType,
        customerName:
          customerType === "walkin" && !customerName
            ? "Walk-in Müşteri"
            : customerName,
        customerSurname: customerSurname || "",
        customerGender: customerGender || "",
        customerEmail: customerEmail || "",
        customerPhone: customerPhone || "",
        companyName: companyName || "",
        guestCount: Number(guestCount),
        startTime,
        endTime,
        tableId,
        status,
        arrivalStatus: arrivalStatus || "waiting",
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

      // Save customer data to customers collection (skip for walk-in without details)
      if (
        customerType !== "walkin" &&
        customerName &&
        (customerEmail || customerPhone)
      ) {
        try {
          const customerData = {
            customerType,
            name: customerName,
            surname: customerSurname || "",
            gender: customerGender || "",
            email: customerEmail || "",
            phone: customerPhone || "",
            companyName: companyName || "",
            restaurantId: activeRestaurant.id,
            companyId:
              company?.id || activeRestaurant.companyId || "default-company",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          // Create a unique customer ID based on email or phone
          const customerId = customerEmail
            ? `customer_${customerEmail.replace(/[^a-zA-Z0-9]/g, "_")}`
            : `customer_${(customerPhone || "").replace(/[^0-9]/g, "")}`;

          console.log("🔥 Saving customer data:", customerData);
          console.log("🔥 Customer ID:", customerId);

          const customerRef = ref(db, `customers/${customerId}`);
          await set(customerRef, customerData);

          console.log("✅ Customer saved successfully!");
          toast.success("Müşteri bilgileri kaydedildi");

          // Add the new customer to the customers list immediately
          setCustomers((prevCustomers) => {
            const existingIndex = prevCustomers.findIndex(
              (c) => c.id === customerId
            );
            if (existingIndex >= 0) {
              // Update existing customer
              const updatedCustomers = [...prevCustomers];
              updatedCustomers[existingIndex] = {
                id: customerId,
                ...customerData,
              };
              return updatedCustomers;
            } else {
              // Add new customer
              return [...prevCustomers, { id: customerId, ...customerData }];
            }
          });
        } catch (customerError) {
          console.error("❌ Error saving customer:", customerError);
          toast.error("Müşteri bilgileri kaydedilemedi");
        }
      } else {
        console.log("⚠️ Customer not saved - missing required fields:", {
          customerName,
          customerEmail,
          customerPhone,
        });
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

  // Staff info modal functions
  const handleStaffInfoClick = (tableId: string) => {
    setSelectedTableForStaffInfo(tableId);
    setStaffInfoModalOpen(true);
  };

  const getTableAssignment = (tableId: string) => {
    return staffAssignments[tableId] || null;
  };

  const hasStaffAssignment = (tableId: string) => {
    const assignment = getTableAssignment(tableId);
    return assignment && (assignment.waiterId || assignment.buserId);
  };

  // Masa numarasına tıklayınca rezervasyon popup'ını aç
  const handleTableNumberClick = (tableId: string) => {
    // Handle table number click to create new reservation

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Geçerli saati en yakın 15 dakikaya yuvarla
    const roundedMinute = Math.ceil(currentMinute / 15) * 15;
    let startHour = currentHour;
    let startMinute = roundedMinute;

    if (startMinute >= 60) {
      startHour += 1;
      startMinute = 0;
    }

    const startTime = `${startHour.toString().padStart(2, "0")}:${startMinute
      .toString()
      .padStart(2, "0")}`;

    // Restaurant ayarlarından default süreyi al (dakika cinsinden), yoksa 120 dakika (2 saat)
    const defaultDurationMinutes =
      restaurantSettings?.settings?.reservationDuration ||
      restaurantSettings?.reservationDuration ||
      120;

    // Bitiş saatini hesapla
    const endTimeMinutes =
      startHour * 60 + startMinute + defaultDurationMinutes;
    const endHour = Math.floor(endTimeMinutes / 60) % 24;
    const endMinute = endTimeMinutes % 60;
    const endTime = `${endHour.toString().padStart(2, "0")}:${endMinute
      .toString()
      .padStart(2, "0")}`;

    // Table clicked - creating new reservation with current time

    // Form değerlerini ayarla
    setFormValues({
      customerType: "walkin",
      customerName: "",
      customerSurname: "",
      customerGender: "",
      customerEmail: "",
      customerPhone: "",
      companyName: "",
      guestCount: 2,
      startTime: startTime,
      endTime: endTime,
      tableId: tableId,
      status: "confirmed",
      note: "",
    });

    setEditingReservation(null);
    setIsReservationModalOpen(true);
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
            <button
              className="p-2 rounded-lg hover:bg-gray-100"
              onClick={async () => {
                console.log("🔍 Current customers:", customers);
                try {
                  const customersRef = ref(db, "customers");
                  const snapshot = await get(customersRef);
                  if (snapshot.exists()) {
                    console.log("🔍 Firebase customers data:", snapshot.val());
                  } else {
                    console.log("🔍 No customers in Firebase");
                  }
                } catch (error) {
                  console.error("🔍 Error fetching customers:", error);
                }
              }}
              title="Debug Customers"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>

            {/* Garson Ataması ve Yeni Rezervasyon butonları yan yana */}
            <button
              onClick={() => setShowStaffModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Users className="w-4 h-4" />
              <span>Garson Ataması</span>
            </button>

            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-1"
              onClick={() => {
                console.log("🎯 RESERVATION DEBUG - Yeni Rezervasyon butonu", {
                  restaurantSettings,
                  currentRestaurant: currentRestaurant?.name,
                });

                // Güncel saati al ve ayarla
                const now = new Date();
                const currentHour = now.getHours();
                const currentMinute = now.getMinutes();

                // En yakın 15 dakikaya yuvarla
                const roundedMinute = Math.ceil(currentMinute / 15) * 15;
                let startHour = currentHour;
                let startMinute = roundedMinute;

                if (startMinute >= 60) {
                  startHour += 1;
                  startMinute = 0;
                }

                const startTime = `${startHour
                  .toString()
                  .padStart(2, "0")}:${startMinute
                  .toString()
                  .padStart(2, "0")}`;

                // Restaurant ayarlarından default süreyi al
                const defaultDurationMinutes =
                  restaurantSettings?.settings?.reservationDuration ||
                  restaurantSettings?.reservationDuration ||
                  120;

                // Bitiş saatini hesapla
                const endTimeMinutes =
                  startHour * 60 + startMinute + defaultDurationMinutes;
                const endHour = Math.floor(endTimeMinutes / 60) % 24;
                const endMinute = endTimeMinutes % 60;
                const endTime = `${endHour
                  .toString()
                  .padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`;

                console.log("🔧 New reservation button clicked", {
                  currentTime: `${currentHour}:${currentMinute}`,
                  startTime,
                  endTime,
                  defaultDurationMinutes,
                });

                setEditingReservation(null);
                setFormValues({
                  customerType: "walkin",
                  guestCount: 2,
                  startTime: startTime,
                  endTime: endTime,
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
                                className={`h-[30px] py-1 px-3 flex justify-between items-center bg-white border-b border-gray-200 ${
                                  formValues.tableId === table.id
                                    ? "bg-blue-50"
                                    : ""
                                }`}
                                key={table.id}
                              >
                                <div
                                  className="font-medium text-sm cursor-pointer hover:text-blue-600 transition-colors hover:bg-blue-50 px-2 py-1 rounded"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log(
                                      "🎯 RESERVATION DEBUG - Table number clicked:",
                                      table.id
                                    );
                                    handleTableNumberClick(table.id);
                                  }}
                                  title="📅 Rezervasyon oluştur"
                                >
                                  {table.number}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <div className="text-gray-500 text-xs">
                                    {capacityText}
                                  </div>
                                  {hasActiveReservation && (
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                  )}
                                  {/* Staff info icon */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStaffInfoClick(table.id);
                                    }}
                                    className={`p-1 rounded transition-colors ${
                                      hasStaffAssignment(table.id)
                                        ? "text-blue-600 hover:bg-blue-100"
                                        : "text-gray-400 hover:bg-gray-100"
                                    }`}
                                    title={
                                      hasStaffAssignment(table.id)
                                        ? "Personel atanmış"
                                        : "Personel atanmamış"
                                    }
                                  >
                                    <User className="w-4 h-4" />
                                  </button>
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
                                                        {reservation.customerType ===
                                                        "walkin" ? (
                                                          <>
                                                            🚶 Walk-in
                                                            {reservation.customerName &&
                                                              ` - ${reservation.customerName}`}
                                                          </>
                                                        ) : reservation.customerType ===
                                                            "company" &&
                                                          reservation.companyName ? (
                                                          <>
                                                            🏢{" "}
                                                            {
                                                              reservation.companyName
                                                            }
                                                          </>
                                                        ) : (
                                                          <>
                                                            {reservation.customerName ||
                                                              "İsimsiz"}
                                                            {reservation.customerSurname &&
                                                              ` ${reservation.customerSurname}`}
                                                          </>
                                                        )}
                                                      </div>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                      <span className="bg-white/20 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-white font-medium">
                                                        {reservation.guestCount}
                                                      </span>
                                                      {reservation.note &&
                                                        reservation.note.trim() && (
                                                          <span
                                                            className="bg-white/30 backdrop-blur-sm px-1 py-0.5 rounded text-[10px] text-white"
                                                            title={
                                                              reservation.note
                                                            }
                                                          >
                                                            💬
                                                          </span>
                                                        )}
                                                    </div>
                                                  </div>
                                                </div>

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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingReservation
                  ? "🔧 Rezervasyon Düzenle"
                  : "➕ Yeni Rezervasyon"}
              </h3>
              <button
                className="text-gray-400 hover:text-gray-500 transition-colors"
                onClick={() => {
                  setIsReservationModalOpen(false);
                  setShowCustomerSuggestions(false);
                }}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer Information Section */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-lg font-medium text-blue-900 mb-4">
                  👤 Müşteri Bilgileri
                </h4>

                {/* Customer Type Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Müşteri Türü *
                  </label>
                  <div className="flex space-x-4 flex-wrap">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="customerType"
                        value="walkin"
                        checked={formValues.customerType === "walkin"}
                        onChange={(e) =>
                          setFormValues({
                            ...formValues,
                            customerType: e.target.value as
                              | "individual"
                              | "company"
                              | "walkin",
                          })
                        }
                        className="mr-2"
                      />
                      <span>🚶 Walk-in</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="customerType"
                        value="individual"
                        checked={formValues.customerType === "individual"}
                        onChange={(e) =>
                          setFormValues({
                            ...formValues,
                            customerType: e.target.value as
                              | "individual"
                              | "company"
                              | "walkin",
                          })
                        }
                        className="mr-2"
                      />
                      <span>👤 Bireysel</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="customerType"
                        value="company"
                        checked={formValues.customerType === "company"}
                        onChange={(e) =>
                          setFormValues({
                            ...formValues,
                            customerType: e.target.value as
                              | "individual"
                              | "company"
                              | "walkin",
                          })
                        }
                        className="mr-2"
                      />
                      <span>🏢 Firma</span>
                    </label>
                  </div>
                </div>

                {/* Company Name Field (visible when company is selected) */}
                {formValues.customerType === "company" && (
                  <div className="mb-4 relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Firma Adı *
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formValues.companyName || ""}
                      onChange={(e) =>
                        handleCustomerFieldChange("companyName", e.target.value)
                      }
                      placeholder="Firma adı"
                      autoComplete="off"
                    />

                    {/* Company Name Autocomplete Suggestions */}
                    {activeSearchField === "companyName" &&
                      showCustomerSuggestions &&
                      filteredCustomers.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                          {filteredCustomers.map((customer, index) => (
                            <div
                              key={`company-${customer.id || index}`}
                              className="px-3 py-2 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                              onClick={() => selectCustomer(customer)}
                            >
                              <div className="font-medium text-gray-900">
                                <span className="text-blue-600 mr-2">🏢</span>
                                {customer.companyName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {customer.name} {customer.surname} •{" "}
                                {customer.email} • {customer.phone}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                )}

                {/* Show customer fields only for non-walk-in customers */}
                {formValues.customerType !== "walkin" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Name Field with Autocomplete */}
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ad *
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={formValues.customerName || ""}
                        onChange={(e) =>
                          handleCustomerFieldChange(
                            "customerName",
                            e.target.value
                          )
                        }
                        placeholder={
                          (formValues.customerType as
                            | "individual"
                            | "company"
                            | "walkin") === "walkin"
                            ? "Walk-in müşteri (opsiyonel)"
                            : "Müşteri adı"
                        }
                        autoComplete="off"
                      />

                      {/* Autocomplete Suggestions */}
                      {activeSearchField === "customerName" &&
                        showCustomerSuggestions &&
                        filteredCustomers.length > 0 && (
                          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                            {filteredCustomers.map((customer, index) => (
                              <div
                                key={customer.id || index}
                                className="px-3 py-2 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                                onClick={() => selectCustomer(customer)}
                              >
                                <div className="font-medium text-gray-900">
                                  {customer.companyName && (
                                    <span className="text-blue-600 mr-2">
                                      🏢
                                    </span>
                                  )}
                                  {customer.name} {customer.surname}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {customer.email} • {customer.phone}
                                  {customer.companyName && (
                                    <span className="ml-2">
                                      • {customer.companyName}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>

                    {/* Surname */}
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Soyad
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={formValues.customerSurname || ""}
                        onChange={(e) =>
                          handleCustomerFieldChange(
                            "customerSurname",
                            e.target.value
                          )
                        }
                        placeholder="Müşteri soyadı"
                        autoComplete="off"
                      />

                      {/* Surname Autocomplete Suggestions */}
                      {activeSearchField === "customerSurname" &&
                        showCustomerSuggestions &&
                        filteredCustomers.length > 0 && (
                          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                            {filteredCustomers.map((customer, index) => (
                              <div
                                key={`surname-${customer.id || index}`}
                                className="px-3 py-2 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                                onClick={() => selectCustomer(customer)}
                              >
                                <div className="font-medium text-gray-900">
                                  {customer.companyName && (
                                    <span className="text-blue-600 mr-2">
                                      🏢
                                    </span>
                                  )}
                                  {customer.name} {customer.surname}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {customer.email} • {customer.phone}
                                  {customer.companyName && (
                                    <span className="ml-2">
                                      • {customer.companyName}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>

                    {/* Gender */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cinsiyet
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={formValues.customerGender || ""}
                        onChange={(e) =>
                          handleCustomerFieldChange(
                            "customerGender",
                            e.target.value
                          )
                        }
                      >
                        <option value="">Seçiniz</option>
                        <option value="bay">👨 Bay</option>
                        <option value="bayan">👩 Bayan</option>
                      </select>
                    </div>

                    {/* Email */}
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        E-posta
                      </label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={formValues.customerEmail || ""}
                        onChange={(e) =>
                          handleCustomerFieldChange(
                            "customerEmail",
                            e.target.value
                          )
                        }
                        placeholder="ornek@email.com"
                        autoComplete="off"
                      />

                      {/* Email Autocomplete Suggestions */}
                      {activeSearchField === "customerEmail" &&
                        showCustomerSuggestions &&
                        filteredCustomers.length > 0 && (
                          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                            {filteredCustomers.map((customer, index) => (
                              <div
                                key={`email-${customer.id || index}`}
                                className="px-3 py-2 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                                onClick={() => selectCustomer(customer)}
                              >
                                <div className="font-medium text-gray-900">
                                  {customer.companyName && (
                                    <span className="text-blue-600 mr-2">
                                      🏢
                                    </span>
                                  )}
                                  {customer.name} {customer.surname}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {customer.email} • {customer.phone}
                                  {customer.companyName && (
                                    <span className="ml-2">
                                      • {customer.companyName}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>

                    {/* Phone */}
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Telefon
                      </label>
                      <input
                        type="tel"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={formValues.customerPhone || ""}
                        onChange={(e) =>
                          handleCustomerFieldChange(
                            "customerPhone",
                            e.target.value
                          )
                        }
                        placeholder="0555 123 45 67"
                        autoComplete="off"
                      />

                      {/* Phone Autocomplete Suggestions */}
                      {activeSearchField === "customerPhone" &&
                        showCustomerSuggestions &&
                        filteredCustomers.length > 0 && (
                          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                            {filteredCustomers.map((customer, index) => (
                              <div
                                key={`phone-${customer.id || index}`}
                                className="px-3 py-2 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                                onClick={() => selectCustomer(customer)}
                              >
                                <div className="font-medium text-gray-900">
                                  {customer.companyName && (
                                    <span className="text-blue-600 mr-2">
                                      🏢
                                    </span>
                                  )}
                                  {customer.name} {customer.surname}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {customer.email} • {customer.phone}
                                  {customer.companyName && (
                                    <span className="ml-2">
                                      • {customer.companyName}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  </div>
                )}

                {/* Guest Count for all customer types */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kişi Sayısı *
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formValues.guestCount || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormValues({
                        ...formValues,
                        guestCount: value === "" ? 0 : parseInt(value) || 0,
                      });
                    }}
                    placeholder="Kaç kişi?"
                  />
                </div>
              </div>

              {/* Reservation Details Section */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="text-lg font-medium text-green-900 mb-4">
                  📅 Rezervasyon Detayları
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Table Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Masa *
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={formValues.tableId || ""}
                      onChange={(e) =>
                        setFormValues({
                          ...formValues,
                          tableId: e.target.value,
                        })
                      }
                    >
                      <option value="">Masa Seçiniz</option>
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
                            🍽️ Masa {table.number} - {category?.name || "Genel"}{" "}
                            ({minCapacity}-{maxCapacity} kişi)
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Start Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Başlangıç Saati *
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={formValues.startTime || ""}
                      onChange={(e) => {
                        const newStartTime = e.target.value;
                        const currentIndex = timeSlots.findIndex(
                          (slot) => slot === newStartTime
                        );
                        const nextIndex = currentIndex + 1;
                        const newEndTime =
                          nextIndex < timeSlots.length
                            ? timeSlots[nextIndex]
                            : timeSlots[0];

                        setFormValues({
                          ...formValues,
                          startTime: newStartTime,
                          endTime: newEndTime,
                        });
                      }}
                    >
                      {timeSlots.map((time) => (
                        <option key={`start-${time}`} value={time}>
                          🕐 {time}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* End Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bitiş Saati *
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={formValues.endTime || ""}
                      onChange={(e) =>
                        setFormValues({
                          ...formValues,
                          endTime: e.target.value,
                        })
                      }
                    >
                      {timeSlots.map((time) => {
                        const isDisabled =
                          getTimeInMinutes(time) <=
                          getTimeInMinutes(formValues.startTime || "19:00");
                        return (
                          <option
                            key={`end-${time}`}
                            value={time}
                            disabled={isDisabled}
                          >
                            🕐 {time}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Durum
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={formValues.status || "confirmed"}
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
                      <option value="confirmed">✅ Onaylandı</option>
                      <option value="pending">⏳ Beklemede</option>
                      <option value="cancelled">❌ İptal</option>
                    </select>
                  </div>

                  {/* Notes */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notlar
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={formValues.note || ""}
                      onChange={(e) =>
                        setFormValues({ ...formValues, note: e.target.value })
                      }
                      rows={2}
                      placeholder="Rezervasyon ile ilgili notlar..."
                    />
                  </div>
                </div>
              </div>

              {/* Arrival Status Section */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="text-lg font-medium text-purple-900 mb-4">
                  📍 Müşteri Durumu
                </h4>

                <div className="flex space-x-4">
                  {/* Waiting Button */}
                  <button
                    type="button"
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                      formValues.arrivalStatus === "waiting"
                        ? "bg-yellow-500 text-white shadow-lg transform scale-105"
                        : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                    }`}
                    onClick={() =>
                      setFormValues({ ...formValues, arrivalStatus: "waiting" })
                    }
                  >
                    ⏰ Bekliyor
                  </button>

                  {/* Arrived Button */}
                  <button
                    type="button"
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                      formValues.arrivalStatus === "arrived"
                        ? "bg-pink-500 text-white shadow-lg transform scale-105"
                        : "bg-pink-100 text-pink-800 hover:bg-pink-200"
                    }`}
                    onClick={() =>
                      setFormValues({ ...formValues, arrivalStatus: "arrived" })
                    }
                  >
                    🎉 Geldi
                  </button>

                  {/* Departed Button */}
                  <button
                    type="button"
                    className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                      formValues.arrivalStatus === "departed"
                        ? "bg-gray-500 text-white shadow-lg transform scale-105"
                        : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                    }`}
                    onClick={() =>
                      setFormValues({
                        ...formValues,
                        arrivalStatus: "departed",
                      })
                    }
                  >
                    👋 Gitti
                  </button>
                </div>

                <p className="text-sm text-purple-700 mt-2">
                  💡 Müşteri durumu rezervasyon kartının rengini belirler
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
              <div className="flex space-x-3">
                {editingReservation && (
                  <button
                    type="button"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                    onClick={handleDeleteReservation}
                  >
                    <span>🗑️</span>
                    <span>Sil</span>
                  </button>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                  onClick={() => {
                    setIsReservationModalOpen(false);
                    setShowCustomerSuggestions(false);
                  }}
                >
                  İptal (Esc)
                </button>
                <button
                  type="button"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  onClick={handleSaveReservation}
                >
                  <span>💾</span>
                  <span>Kaydet (Enter)</span>
                </button>
              </div>
            </div>

            {/* Help Text */}
            <div className="px-6 pb-4 text-center">
              <p className="text-xs text-gray-500">
                💡 <strong>Enter</strong> ile kaydet, <strong>Esc</strong> ile
                iptal et
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Staff Assignment Modal */}
      <StaffAssignmentModal
        isOpen={showStaffModal}
        onClose={() => setShowStaffModal(false)}
      />

      {/* Table Staff Info Modal */}
      {selectedTableForStaffInfo && (
        <TableStaffInfoModal
          isOpen={staffInfoModalOpen}
          onClose={() => {
            setStaffInfoModalOpen(false);
            setSelectedTableForStaffInfo(null);
          }}
          tableId={selectedTableForStaffInfo}
          tableNumber={
            tables.find((t) => t.id === selectedTableForStaffInfo)?.number || 0
          }
          assignment={getTableAssignment(selectedTableForStaffInfo)}
          waitersData={waitersData}
          selectedDate={selectedDate}
          restaurantId={currentRestaurant?.id || ""}
          onUpdate={() => {
            // Staff assignments'ları yeniden yükle
            const loadStaffData = async () => {
              if (!currentRestaurant) return;
              try {
                const todayStr = format(selectedDate, "yyyy-MM-dd");
                const assignmentsRef = ref(
                  db,
                  `assignments/${currentRestaurant.id}/${todayStr}`
                );
                const assignmentsSnapshot = await get(assignmentsRef);
                if (assignmentsSnapshot.exists()) {
                  setStaffAssignments(assignmentsSnapshot.val());
                } else {
                  setStaffAssignments({});
                }
              } catch (error) {
                console.error("Staff data reload error:", error);
              }
            };
            loadStaffData();
          }}
        />
      )}
    </div>
  );
}
