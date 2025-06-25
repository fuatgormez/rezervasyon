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

// Time slots - Saatlik periyotlar
const timeSlots: string[] = [];
for (let hour = 7; hour <= 27; hour++) {
  // 27 = 03:00 (ertesi gün)
  const h = (hour % 24).toString().padStart(2, "0");
  timeSlots.push(`${h}:00`);
}

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

  // Yeni sürükleyerek resize için state'ler
  const [dragResizing, setDragResizing] = useState<{
    id: string;
    direction: "start" | "end";
    startX: number;
    startTime: string;
    endTime: string;
    originalStartTime: string;
    originalEndTime: string;
  } | null>(null);
  const [dragResizePreview, setDragResizePreview] = useState<{
    startTime: string;
    endTime: string;
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

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load categories
        const categoriesRef = ref(db, "table_categories");
        const categoriesSnapshot = await get(categoriesRef);

        if (categoriesSnapshot.exists()) {
          const categoriesData = categoriesSnapshot.val();
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

          // Set first category as default if none is selected
          if (loadedCategories.length > 0 && !activeCategory) {
            setActiveCategory(loadedCategories[0].id);
          }
        }

        // Load tables
        const tablesRef = ref(db, "tables");
        const tablesSnapshot = await get(tablesRef);

        if (tablesSnapshot.exists()) {
          const tablesData = tablesSnapshot.val();
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
        }

        // Load reservations
        const reservationsRef = ref(db, "reservations");
        onValue(reservationsRef, (snapshot) => {
          if (snapshot.exists()) {
            const reservationsData = snapshot.val();
            const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
            const loadedReservations = Object.entries(reservationsData)
              .filter(([_, data]: [string, any]) => {
                const reservationDate =
                  data.date || format(new Date(), "yyyy-MM-dd");
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
          } else {
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
  }, [selectedDate, activeCategory]);

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
      grouped[category.id] = {
        category,
        tables: tables.filter((t) => t.categoryId === category.id),
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
    return reservations.find(
      (res) =>
        res.tableId === tableId &&
        getTimeInMinutes(res.startTime) <= getTimeInMinutes(time) &&
        getTimeInMinutes(res.endTime) > getTimeInMinutes(time)
    );
  };

  // Handle card click - directly with reservation object
  const handleCardClick = (reservation: Reservation) => {
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
    const existingReservation = getReservationAtTime(tableId, time);

    if (existingReservation) {
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
      const endTime = addTimeMinutes(time, 60); // Default 1 hour duration
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
        toast.error("Please fill in required fields");
        return;
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
    console.log(
      `🔧 handleDragResizeStart called: ${reservationId}, direction: ${direction}`
    );
    e.stopPropagation();
    e.preventDefault();

    const reservation = reservations.find((r) => r.id === reservationId);
    if (!reservation) return;

    const dragData = {
      id: reservationId,
      direction,
      startX: e.clientX,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      originalStartTime: reservation.startTime,
      originalEndTime: reservation.endTime,
    };

    setDragResizing(dragData);

    console.log(`🔧 Event listeners added, startX: ${e.clientX}`);

    // Preview verilerini local olarak tut
    let currentPreview = {
      startTime: dragData.originalStartTime,
      endTime: dragData.originalEndTime,
    };

    // Closure içinde handler'ları tanımla
    const handleMove = (e: MouseEvent) => {
      console.log(
        `🔧 handleDragResizeMove: deltaX=${e.clientX - dragData.startX}`
      );

      const deltaX = e.clientX - dragData.startX;
      const slotWidth = 150;
      const subSlotWidth = slotWidth / 4; // 15 dakikalık alt bölümler

      // Kaç 15 dakika hareket ettiğimizi hesapla
      const minutesDelta = Math.round(deltaX / subSlotWidth) * 15;

      let newStartTime = dragData.originalStartTime;
      let newEndTime = dragData.originalEndTime;

      if (dragData.direction === "start") {
        const newStartMinutes =
          getTimeInMinutes(dragData.originalStartTime) + minutesDelta;
        newStartTime = formatTime(Math.max(0, newStartMinutes));

        // Başlangıç saati bitiş saatinden sonra olamaz
        if (getTimeInMinutes(newStartTime) >= getTimeInMinutes(newEndTime)) {
          newStartTime = formatTime(getTimeInMinutes(newEndTime) - 15);
        }
      } else {
        const newEndMinutes =
          getTimeInMinutes(dragData.originalEndTime) + minutesDelta;
        newEndTime = formatTime(Math.max(15, newEndMinutes)); // En az 15 dakika

        // Bitiş saati başlangıç saatinden önce olamaz
        if (getTimeInMinutes(newEndTime) <= getTimeInMinutes(newStartTime)) {
          newEndTime = formatTime(getTimeInMinutes(newStartTime) + 15);
        }
      }

      // Local preview'i güncelle
      currentPreview = {
        startTime: newStartTime,
        endTime: newEndTime,
      };

      // State'i de güncelle (görsel için)
      setDragResizePreview(currentPreview);

      console.log(
        `🔧 Preview updated: ${currentPreview.startTime} - ${currentPreview.endTime}`
      );
    };

    const handleEnd = async (e: MouseEvent) => {
      console.log(`🔧 handleDragResizeEnd called`);
      console.log(
        `🔧 Final preview: ${currentPreview.startTime} - ${currentPreview.endTime}`
      );

      // Event listener'ları kaldır
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleEnd);

      try {
        // Eğer zaman değişmediyse hiçbir şey yapma
        if (
          currentPreview.startTime === dragData.originalStartTime &&
          currentPreview.endTime === dragData.originalEndTime
        ) {
          console.log(`🔧 No time change, cleaning up`);
          setDragResizing(null);
          setDragResizePreview(null);
          return;
        }

        const reservation = reservations.find((r) => r.id === reservationId);
        if (!reservation) {
          setDragResizing(null);
          setDragResizePreview(null);
          return;
        }

        // Çakışma kontrolü
        const isOverlapping = reservations.some((res) => {
          if (res.id === reservation.id) return false;
          if (res.tableId !== reservation.tableId) return false;
          if (res.date !== reservation.date) return false;

          const resStart = getTimeInMinutes(res.startTime);
          const resEnd = getTimeInMinutes(res.endTime);
          const newStart = getTimeInMinutes(currentPreview.startTime);
          const newEnd = getTimeInMinutes(currentPreview.endTime);

          return newStart < resEnd && newEnd > resStart;
        });

        if (isOverlapping) {
          toast.error("Bu saatte başka bir rezervasyon var", {
            id: "resize-error",
          });
          setDragResizing(null);
          setDragResizePreview(null);
          return;
        }

        const updatedReservation = {
          ...reservation,
          startTime: currentPreview.startTime,
          endTime: currentPreview.endTime,
        };

        console.log(`🔧 Updating Firebase with:`, updatedReservation);
        const reservationRef = ref(db, `reservations/${reservation.id}`);
        await update(reservationRef, updatedReservation);
        console.log(`🔧 Firebase update successful`);

        toast.success("Rezervasyon saati güncellendi", {
          id: "resize-success",
        });
      } catch (error) {
        console.error("Error resizing reservation:", error);
        toast.error("Rezervasyon saati güncellenirken hata oluştu", {
          id: "resize-error",
        });
      } finally {
        setDragResizing(null);
        setDragResizePreview(null);
      }
    };

    // Mouse move ve mouse up event'lerini document'e ekle
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleEnd);
  };

  const handleDragResizeMove = (e: MouseEvent) => {
    if (!dragResizing) return;
    console.log(
      `🔧 handleDragResizeMove: deltaX=${e.clientX - dragResizing.startX}`
    );

    const deltaX = e.clientX - dragResizing.startX;
    const slotWidth = 150;
    const subSlotWidth = slotWidth / 4; // 15 dakikalık alt bölümler

    // Kaç 15 dakika hareket ettiğimizi hesapla
    const minutesDelta = Math.round(deltaX / subSlotWidth) * 15;

    let newStartTime = dragResizing.originalStartTime;
    let newEndTime = dragResizing.originalEndTime;

    if (dragResizing.direction === "start") {
      const newStartMinutes =
        getTimeInMinutes(dragResizing.originalStartTime) + minutesDelta;
      newStartTime = formatTime(Math.max(0, newStartMinutes));

      // Başlangıç saati bitiş saatından sonra olamaz
      if (getTimeInMinutes(newStartTime) >= getTimeInMinutes(newEndTime)) {
        newStartTime = formatTime(getTimeInMinutes(newEndTime) - 15);
      }
    } else {
      const newEndMinutes =
        getTimeInMinutes(dragResizing.originalEndTime) + minutesDelta;
      newEndTime = formatTime(Math.max(15, newEndMinutes)); // En az 15 dakika

      // Bitiş saati başlangıç saatinden önce olamaz
      if (getTimeInMinutes(newEndTime) <= getTimeInMinutes(newStartTime)) {
        newEndTime = formatTime(getTimeInMinutes(newStartTime) + 15);
      }
    }

    setDragResizePreview({
      startTime: newStartTime,
      endTime: newEndTime,
    });
  };

  const handleDragResizeEnd = async (e: MouseEvent) => {
    console.log(`🔧 handleDragResizeEnd called`);
    if (!dragResizing || !dragResizePreview) {
      console.log(`🔧 No dragResizing or dragResizePreview, cleaning up`);
      cleanupDragResize();
      return;
    }

    try {
      const reservation = reservations.find((r) => r.id === dragResizing.id);
      if (!reservation) {
        cleanupDragResize();
        return;
      }

      // Çakışma kontrolü
      const isOverlapping = reservations.some((res) => {
        if (res.id === reservation.id) return false;
        if (res.tableId !== reservation.tableId) return false;
        if (res.date !== reservation.date) return false;

        const resStart = getTimeInMinutes(res.startTime);
        const resEnd = getTimeInMinutes(res.endTime);
        const newStart = getTimeInMinutes(dragResizePreview.startTime);
        const newEnd = getTimeInMinutes(dragResizePreview.endTime);

        return newStart < resEnd && newEnd > resStart;
      });

      if (isOverlapping) {
        toast.error("Bu saatte başka bir rezervasyon var", {
          id: "resize-error",
        });
        cleanupDragResize();
        return;
      }

      const updatedReservation = {
        ...reservation,
        startTime: dragResizePreview.startTime,
        endTime: dragResizePreview.endTime,
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
      cleanupDragResize();
    }
  };

  const cleanupDragResize = () => {
    console.log(`🔧 cleanupDragResize called`);
    setDragResizing(null);
    setDragResizePreview(null);
    document.removeEventListener("mousemove", handleDragResizeMove);
    document.removeEventListener("mouseup", handleDragResizeEnd);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupDragResize();
    };
  }, []);

  // Keyboard event listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (dragResizing) {
          cleanupDragResize();
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

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 text-gray-800">
      {/* Navbar */}
      <div className="flex justify-between items-center bg-white p-4 border-b border-gray-200 shadow-sm">
        <div className="flex items-center space-x-6">
          <div className="text-2xl font-bold text-blue-600">
            Reservation Management
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
              Settings
            </Link>
            <Link
              href="/admin/staff"
              className="px-4 py-2 rounded-lg hover:bg-gray-100"
            >
              Staff Management
            </Link>
            <Link
              href="/admin/customers"
              className="px-4 py-2 rounded-lg hover:bg-gray-100"
            >
              Customer Management
            </Link>
            <Link
              href="/reservation"
              className="px-4 py-2 rounded-lg hover:bg-gray-100"
            >
              Reservation
            </Link>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/init-db"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Initialize DB
          </Link>
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-1">
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
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
            <span>Today</span>
          </button>
          <div className="flex items-center space-x-2">
            <button
              aria-label="Previous day"
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
                          Today
                        </button>
                        <button
                          onClick={() => setIsCalendarOpen(false)}
                          className="text-sm text-gray-600 hover:text-gray-800"
                          type="button"
                        >
                          Close
                        </button>
                      </div>
                    }
                  />
                </div>
              )}
            </div>
            <button
              aria-label="Next day"
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
              placeholder="Search..."
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
            <span>New Reservation</span>
          </button>
        </div>
      </div>

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
                                    {/* Sadece kart taşıma sırasında sub-slots göster */}
                                    {draggingReservation &&
                                      hoveredCell?.tableId === table.id && (
                                        <div className="absolute inset-0 flex">
                                          {/* 15 dakika */}
                                          <div
                                            className="flex-1 border-r border-cyan-200 bg-cyan-50 hover:bg-cyan-100 cursor-pointer flex items-center justify-center transition-colors opacity-40"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const [hour] = time.split(":");
                                              const subTime = `${hour}:15`;
                                              handleDrop(
                                                e as any,
                                                table.id,
                                                subTime
                                              );
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
                                              handleDrop(
                                                e as any,
                                                table.id,
                                                subTime
                                              );
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
                                              handleDrop(
                                                e as any,
                                                table.id,
                                                subTime
                                              );
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
                                              handleDrop(
                                                e as any,
                                                table.id,
                                                subTime
                                              );
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

                                            if (
                                              startIdx === -1 ||
                                              endIdx === -1 ||
                                              endIdx <= startIdx
                                            ) {
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
                                                }`}
                                                style={{
                                                  left: `${leftPosition}px`,
                                                  width: `${widthCalculation}px`,
                                                  height: "26px",
                                                  top: "2px",
                                                  backgroundColor: "#f87171",
                                                  borderColor: "#b91c1c",
                                                  minWidth: "50px",
                                                  touchAction: "none",
                                                  backdropFilter: "blur(4px)",
                                                  boxShadow:
                                                    "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
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
                                                      className="absolute left-0 top-0 bottom-0 w-4 cursor-ew-resize hover:bg-white/60 transition-colors group z-30 bg-white/20"
                                                      onMouseDown={(e) => {
                                                        console.log(
                                                          `🔧 Left resize handle clicked for reservation: ${reservation.id}`
                                                        );
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
                                                      className="absolute right-0 top-0 bottom-0 w-4 cursor-ew-resize hover:bg-white/60 transition-colors group z-30 bg-white/20"
                                                      onMouseDown={(e) => {
                                                        console.log(
                                                          `🔧 Right resize handle clicked for reservation: ${reservation.id}`
                                                        );
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
                    Guest Count
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
                      return (
                        <option key={table.id} value={table.id}>
                          Table {table.number} -{" "}
                          {category?.name || "No Category"} ({table.capacity}{" "}
                          seats)
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
                    End Time
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
