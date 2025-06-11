"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  format,
  subDays,
  addDays,
  parse,
  addMinutes,
  isBefore,
  isAfter,
  setHours,
  setMinutes,
  isToday,
} from "date-fns";
import { tr } from "date-fns/locale";
import {
  BiSearch,
  BiArrowToRight,
  BiArrowToLeft,
  BiRefresh,
} from "react-icons/bi";
import { IoMdRefresh } from "react-icons/io";
import { HiOutlineDotsVertical } from "react-icons/hi";
import { FiChevronDown, FiUsers } from "react-icons/fi";
import Link from "next/link";
import toast from "react-hot-toast";
import { DayPicker } from "react-day-picker";
import Draggable from "react-draggable";
import { Resizable, ResizeCallbackData } from "react-resizable";
import "react-resizable/css/styles.css";
import DraggableReservationCard from "@/components/reservation/DraggableReservationCard";
import StaffAssignmentForm from "@/components/StaffAssignmentForm";
import { db } from "@/config/firebase"; // Firebase Realtime Database referansını kullan
import {
  ref,
  get,
  set,
  push,
  update,
  remove,
  query as dbQuery,
  orderByChild,
  equalTo,
  onValue,
  child,
} from "firebase/database";
import { v4 as uuidv4 } from "uuid";

// SweetAlert2 import
import Swal from "sweetalert2";

// Bu componenti sadece tarayıcıda çalıştırılacak şekilde dinamik olarak import ediyoruz
// SSG sırasında çalıştırılmaz
const AdminPageContent = dynamic(() => Promise.resolve(AdminPageComponent), {
  ssr: false,
});

// Masa kategorisi arayüzü
interface TableCategoryType {
  id: string;
  name: string;
  color: string;
  borderColor: string;
  backgroundColor: string;
}

// Masa türü arayüzü
interface TableType {
  id: string;
  number: number;
  capacity: number;
  categoryId: string;
  status: "Available" | "Unavailable" | "Reserved";
}

// Rezervasyon türü arayüzü
interface ReservationType {
  id: string;
  tableId: string;
  customerName: string;
  guestCount: number;
  startTime: string;
  endTime: string;
  status: "confirmed" | "pending" | "cancelled";
  note?: string;
  color?: string;
  staffIds?: string[]; // Atanmış garson ID'leri
  position?: { x: number; y: number }; // Sürükleme pozisyonu
}

interface ActiveFormType {
  id: string;
  customerName: string;
  tableId?: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  lastActivity: Date;
  status: "filling_form" | "selecting_table" | "completing";
  isConflict?: boolean;
}

// Ana sayfa
export default function AdminPage() {
  return <AdminPageContent />;
}

// Dakikayı saat:dakika formatına çevirme
const convertMinutesToTime = (totalMinutes: number): string => {
  // Gün aşımlarını elle hesapla
  let adjustedMinutes = totalMinutes;

  // Dakika negatifse veya 24 saati aşıyorsa düzelt
  while (adjustedMinutes < 0) {
    adjustedMinutes += 24 * 60; // 24 saat ekle
  }

  while (adjustedMinutes >= 24 * 60) {
    adjustedMinutes -= 24 * 60; // 24 saat çıkar
  }

  const hours = Math.floor(adjustedMinutes / 60);
  const minutes = adjustedMinutes % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
};

// Saati dakikaya çevirme
const convertTimeToMinutes = (time: string): number => {
  const [hoursStr, minutesStr] = time.split(":");
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  return hours * 60 + minutes;
};

// Asıl içerik - Window ve tarayıcı API'larını kullanabilir
function AdminPageComponent() {
  const currentDate = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(format(new Date(), "HH:mm"));
  const [currentTimePosition, setCurrentTimePosition] = useState<number | null>(
    null
  );
  // Kullanıcının son etkileşim zamanını tutacak state
  const [lastUserInteraction, setLastUserInteraction] = useState<Date>(
    new Date()
  );
  // Manuel kaydırma yapıldığını takip etmek için
  const [userHasScrolled, setUserHasScrolled] = useState<boolean>(false);

  const mainContentRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Seçili rezervasyon state'i
  const [selectedReservation, setSelectedReservation] =
    useState<ReservationType | null>(null);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);

  // Garson listesi
  const [staff, setStaff] = useState<
    Array<{ id: string; name: string; position: string }>
  >([
    { id: "s1", name: "Ahmet Yılmaz", position: "Garson" },
    { id: "s2", name: "Ayşe Kaya", position: "Kıdemli Garson" },
    { id: "s3", name: "Mehmet Demir", position: "Şef Garson" },
  ]);

  // Sabit değerleri state'e dönüştürelim ki değiştirilebilir olsunlar
  const [cellWidth, setCellWidth] = useState<number>(160); // Saat hücresi genişliği
  const [cellHeight, setCellHeight] = useState<number>(56); // Saat hücresi yüksekliği (h-14 = 56px)

  // CELL_WIDTH sabitini cellWidth state değişkeniyle değiştirelim
  const CATEGORY_WIDTH = 200; // Kategori sütunu genişliği

  // Hücre boyutlarını güncelleme fonksiyonu
  const handleCellWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWidth = parseInt(e.target.value);
    setCellWidth(newWidth);
  };

  const handleCellHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHeight = parseInt(e.target.value);
    setCellHeight(newHeight);
  };

  // Sabit saat dizisi
  const hours = useMemo(() => {
    const result = [];
    // Önce 07:00 ve 08:00'i ekleyelim
    for (let i = 7; i <= 8; i++) {
      result.push(`${i.toString().padStart(2, "0")}:00`);
    }
    // Sonra 09:00'dan 24:00'a kadar
    for (let i = 9; i <= 24; i++) {
      result.push(`${i.toString().padStart(2, "0")}:00`);
    }
    // Son olarak 01:00 ve 02:00'yi ekleyelim
    for (let i = 1; i <= 2; i++) {
      result.push(`${i.toString().padStart(2, "0")}:00`);
    }
    return result;
  }, []);

  // Masa kategorileri
  const [tableCategories, setTableCategories] = useState<TableCategoryType[]>([
    {
      id: "1",
      name: "TERAS",
      color: "rgba(74, 108, 155, 0.8)",
      borderColor: "#5880B3",
      backgroundColor: "#f0f9ff",
    },
    {
      id: "2",
      name: "BAHÇE",
      color: "rgba(85, 138, 112, 0.8)",
      borderColor: "#509F6D",
      backgroundColor: "#f0fdf4",
    },
    {
      id: "3",
      name: "İÇ SALON",
      color: "rgba(166, 97, 97, 0.8)",
      borderColor: "#A06363",
      backgroundColor: "#fef2f2",
    },
  ]);

  // HEX rengini açık bir versiyona çevirme (açıklık ekleyerek)
  const getLighterColor = (hexColor: string, factor: number = 0.15): string => {
    // HEX değerini RGB'ye çevir
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);

    // Her bir renge açıklık ekle (beyaza doğru kaydir)
    const newR = Math.min(255, r + Math.round((255 - r) * factor));
    const newG = Math.min(255, g + Math.round((255 - g) * factor));
    const newB = Math.min(255, b + Math.round((255 - b) * factor));

    // RGB'yi HEX'e çevir
    return `#${newR.toString(16).padStart(2, "0")}${newG
      .toString(16)
      .padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
  };

  // useEffect ile Firebase'den kategorileri yükle
  useEffect(() => {
    // Netlify dağıtımı ve SSG aşamasında atlanacak
    if (
      process.env.NEXT_PUBLIC_NETLIFY_DEPLOYMENT === "true" &&
      process.env.NEXT_PUBLIC_SKIP_SSG_ADMIN === "true" &&
      typeof window === "undefined"
    ) {
      return;
    }

    // Kategorileri Firebase'den yükle
    const loadCategories = async () => {
      try {
        const categoriesCollection = collection(db, "table_categories");
        const categoriesSnapshot = await getDocs(categoriesCollection);

        if (!categoriesSnapshot.empty) {
          const loadedCategories = categoriesSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || "",
              color: data.color || "rgba(74, 108, 155, 0.8)",
              borderColor: data.border_color || "#5880B3",
              backgroundColor: data.background_color || "#f0f9ff",
            };
          });

          setTableCategories(loadedCategories);
        }
      } catch (error) {
        console.error("Kategoriler yüklenirken hata:", error);
      }
    };

    loadCategories();
  }, []);

  // useEffect ile sayfa yüklendikten sonra yeniden hesapla
  useEffect(() => {
    // Netlify dağıtımı ve SSG aşamasında atlanacak
    if (
      (process.env.NEXT_PUBLIC_NETLIFY_DEPLOYMENT === "true" &&
        process.env.NEXT_PUBLIC_SKIP_SSG_ADMIN === "true") ||
      typeof window === "undefined"
    ) {
      return;
    }

    // Dışarı tıklandığında takvimi kapat
    const handleClickOutside = (event: MouseEvent) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setIsCalendarOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    // Sayfa yüklendiğinde tabloları yükle
    loadTables();

    // Sayfa yüklendiğinde seçili tarihe göre rezervasyonları yükle
    filterReservationsByDate(selectedDate);

    // Karşılama mesajı kontrolü - sadece oturum başına bir kez göster
    const hasShownWelcome = sessionStorage.getItem("hasShownWelcome");
    if (!hasShownWelcome) {
      // Sayfa yüklendiğinde karşılama mesajı göster
      toast.success("Rezervasyon yönetim paneline hoş geldiniz!", {
        position: "bottom-center",
        duration: 3000,
      });
      // Flag'i kaydet
      sessionStorage.setItem("hasShownWelcome", "true");
    }

    // Sayfa yüklendiğinde mevcut zamanı ayarla
    const now = new Date();
    const formattedTime = format(now, "HH:mm");
    setCurrentTime(formattedTime);

    // İlk yüklemede, şimdiki zamanın nerede olduğunu hesapla ve oraya scroll et
    const hourPart = parseInt(formattedTime.split(":")[0]);
    const minutePart = parseInt(formattedTime.split(":")[1]);

    // Geçerli saati bul (7'den başlayarak)
    let hourIndex = -1;
    if (hourPart >= 7 && hourPart <= 24) {
      hourIndex = hourPart - 7;
    } else if (hourPart >= 1 && hourPart <= 2) {
      hourIndex = 24 - 7 + hourPart; // 01:00 ve 02:00 için
    }

    if (hourIndex >= 0) {
      // Saat ve dakikaya göre pozisyonu hesapla
      const position = hourIndex * cellWidth + (minutePart / 60) * cellWidth;

      // Sayfanın ortasına scroll etmek için
      if (gridContainerRef.current) {
        // İlk yükleme için bir kerelik yapıyoruz
        setTimeout(() => {
          const screenWidth = window.innerWidth;
          const scrollPosition =
            CATEGORY_WIDTH + position - screenWidth / 2 + cellWidth / 2;

          gridContainerRef.current?.scrollTo({
            left: Math.max(0, scrollPosition),
            behavior: "smooth",
          });
        }, 500);
      }
    }

    // Mevcut zamanı her dakika güncelle
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(format(now, "HH:mm"));
    }, 60000);

    // Component unmount olduğunda timer'ı temizle
    return () => {
      clearInterval(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [cellWidth, selectedDate]);

  // Mevcut rezervasyonlar
  const [reservations, setReservations] = useState<ReservationType[]>([]);

  // Mevcut zamanın pozisyonunu güncelle
  useEffect(() => {
    // Netlify dağıtımı ve SSG aşamasında atlanacak
    if (
      process.env.NEXT_PUBLIC_NETLIFY_DEPLOYMENT === "true" &&
      process.env.NEXT_PUBLIC_SKIP_SSG_ADMIN === "true" &&
      typeof window === "undefined"
    ) {
      return;
    }

    // Kırmızı çizgiyi merkeze alan fonksiyon
    const centerCurrentTimeLine = () => {
      if (currentTimePosition === null || !gridContainerRef.current) return;

      // Şu anki zaman ve son etkileşim arasındaki fark (milisaniye cinsinden)
      const now = new Date();
      const inactiveTime = now.getTime() - lastUserInteraction.getTime();

      // Kullanıcı son 1 dakikadır (60000 ms) hiçbir etkileşimde bulunmadıysa otomatik olarak merkeze git
      if (inactiveTime > 60000 || !userHasScrolled) {
        // Viewport genişliği ve scroll hesaplaması
        const viewportWidth = gridContainerRef.current.clientWidth;
        const leftPosition = CATEGORY_WIDTH + currentTimePosition;

        // Çizgiyi merkeze getirmek için scroll pozisyonu
        const scrollPosition = leftPosition - viewportWidth / 2;

        // Yumuşak geçişli scroll
        gridContainerRef.current.scrollTo({
          left: Math.max(0, scrollPosition),
          behavior: "smooth",
        });

        console.log(
          "İnaktif süre:",
          Math.round(inactiveTime / 1000),
          "saniye. Kırmızı çizgi sayfanın ortasına getirildi."
        );
        // Kullanıcı scroll durumunu sıfırla
        setUserHasScrolled(false);
      } else {
        console.log(
          "Kullanıcı son 1 dakika içinde etkileşimde bulundu, otomatik merkeze alma atlandı."
        );
      }
    };

    const updateTimePosition = () => {
      const now = new Date();
      const formattedTime = format(now, "HH:mm");
      setCurrentTime(formattedTime);

      // Zamanın hangi hücrede olduğunu bul
      const hourPart = parseInt(formattedTime.split(":")[0]);
      const minutePart = parseInt(formattedTime.split(":")[1]);

      console.log(
        "Güncel saat:",
        formattedTime,
        "Saat kısmı:",
        hourPart,
        "Dakika kısmı:",
        minutePart
      );

      // Geçerli saati bul (7'den başlayarak)
      let hourIndex = -1;

      // Gece yarısından sonraki saatler için düzeltme (00, 01, 02)
      if (hourPart >= 0 && hourPart <= 2) {
        hourIndex = hours.length - (3 - hourPart); // 00:00 için son saat, 01:00 için sondan bir önceki, 02:00 için sondan iki önceki
        console.log(
          "Gece yarısından sonraki saat:",
          hourPart,
          "Hesaplanan indeks:",
          hourIndex
        );
      }
      // Normal saat aralığı (7-24)
      else if (hourPart >= 7 && hourPart <= 23) {
        hourIndex = hourPart - 7;
        console.log(
          "Normal saat aralığı:",
          hourPart,
          "Hesaplanan indeks:",
          hourIndex
        );
      }

      if (hourIndex >= 0 && hourIndex < hours.length) {
        // Saat ve dakikaya göre pozisyonu hesapla
        const position = hourIndex * cellWidth + (minutePart / 60) * cellWidth;
        setCurrentTimePosition(position);
        console.log(
          "Zaman pozisyonu hesaplandı:",
          formattedTime,
          "Saat indeksi:",
          hourIndex,
          "Pozisyon:",
          position,
          "px"
        );

        // Kırmızı çizgiyi merkeze al - sadece ilk hesaplamada
        setTimeout(centerCurrentTimeLine, 100);
      } else {
        setCurrentTimePosition(null);
        console.log(
          "Geçerli saat aralığı dışında (03:00-06:59), çizgi gösterilmeyecek. Saat:",
          hourPart
        );
      }
    };

    // İlk yüklemede çalıştır
    updateTimePosition();

    // Her saniye güncelle
    const timer = setInterval(updateTimePosition, 1000);

    return () => clearInterval(timer);
  }, [
    cellWidth,
    hours,
    currentTimePosition,
    lastUserInteraction,
    userHasScrolled,
  ]);

  // Kullanıcının scroll etkileşimini izleyen yeni useEffect
  useEffect(() => {
    // Netlify dağıtımı ve SSG aşamasında atlanacak
    if (
      (process.env.NEXT_PUBLIC_NETLIFY_DEPLOYMENT === "true" &&
        process.env.NEXT_PUBLIC_SKIP_SSG_ADMIN === "true") ||
      typeof window === "undefined"
    ) {
      return;
    }

    const handleUserScroll = () => {
      // Kullanıcı scroll yaptığında son etkileşim zamanını güncelle
      setLastUserInteraction(new Date());
      // Kullanıcının manuel scroll yaptığını işaretle
      setUserHasScrolled(true);
      console.log(
        "Kullanıcı manuel scroll yaptı, otomatik merkeze alma devre dışı."
      );
    };

    // Kullanıcı herhangi bir tıklama veya dokunma yaptığında son etkileşim zamanını güncelle
    const handleUserInteraction = () => {
      setLastUserInteraction(new Date());
    };

    // Scroll olayını dinle
    const gridContainer = gridContainerRef.current;
    if (gridContainer) {
      gridContainer.addEventListener("scroll", handleUserScroll);
    }

    // Genel kullanıcı etkileşimlerini dinle
    window.addEventListener("mousedown", handleUserInteraction);
    window.addEventListener("touchstart", handleUserInteraction);
    window.addEventListener("keydown", handleUserInteraction);

    // Her 1 dakikada bir, inaktif zaman kontrolü yap ve gerekirse merkeze al
    const inactivityCheckTimer = setInterval(() => {
      const now = new Date();
      const inactiveTime = now.getTime() - lastUserInteraction.getTime();

      // 1 dakikadan fazla süre geçti mi?
      if (inactiveTime > 60000 && userHasScrolled) {
        console.log(
          "1 dakikadan fazla inaktif - otomatik olarak mevcut saate dönülüyor"
        );
        // Kırmızı çizgiyi otomatik olarak merkeze al
        if (currentTimePosition !== null && gridContainerRef.current) {
          const viewportWidth = gridContainerRef.current.clientWidth;
          const leftPosition = CATEGORY_WIDTH + currentTimePosition;
          const scrollPosition = leftPosition - viewportWidth / 2;

          gridContainerRef.current.scrollTo({
            left: Math.max(0, scrollPosition),
            behavior: "smooth",
          });

          // Kullanıcı scroll durumunu sıfırla
          setUserHasScrolled(false);
        }
      }
    }, 10000); // 10 saniyede bir kontrol et

    return () => {
      // Event listener temizleme
      if (gridContainer) {
        gridContainer.removeEventListener("scroll", handleUserScroll);
      }
      window.removeEventListener("mousedown", handleUserInteraction);
      window.removeEventListener("touchstart", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
      clearInterval(inactivityCheckTimer);
    };
  }, [currentTimePosition, lastUserInteraction, userHasScrolled]);

  // Pencere boyutu değiştiğinde içeriği güncelle
  useEffect(() => {
    // Netlify dağıtımı ve SSG aşamasında atlanacak
    if (
      process.env.NEXT_PUBLIC_NETLIFY_DEPLOYMENT === "true" &&
      process.env.NEXT_PUBLIC_SKIP_SSG_ADMIN === "true" &&
      typeof window === "undefined"
    ) {
      return;
    }

    // Kırmızı çizgiyi merkeze alan fonksiyon
    const centerTimeLineOnResize = () => {
      if (currentTimePosition === null || !gridContainerRef.current) return;

      // Viewport genişliği ve scroll hesaplaması
      const viewportWidth = gridContainerRef.current.clientWidth;
      const leftPosition = CATEGORY_WIDTH + currentTimePosition;

      // Çizgiyi merkeze getirmek için scroll pozisyonu
      const scrollPosition = leftPosition - viewportWidth / 2;

      // Yumuşak geçişli scroll
      gridContainerRef.current.scrollTo({
        left: Math.max(0, scrollPosition),
        behavior: "smooth",
      });
    };

    const handleResize = () => {
      // Pencere boyutu değiştiğinde kırmızı çizgiyi merkeze al
      centerTimeLineOnResize();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [CATEGORY_WIDTH, currentTimePosition]);

  // Toplam misafir sayısını hesapla
  const totalGuestCount = useMemo(() => {
    return reservations.reduce((total, res) => total + res.guestCount, 0);
  }, [reservations]);

  // Belirli bir saat için toplam misafir sayısını getir
  const getGuestCountForTimeSlot = (
    hour: string,
    reservationList: ReservationType[]
  ) => {
    // Belirli saat için rezervasyonları filtrele
    const filteredReservations = reservationList.filter((reservation) => {
      const startHour = parseInt(reservation.startTime.split(":")[0]);
      const endHour = parseInt(reservation.endTime.split(":")[0]);
      const currentHour = parseInt(hour.split(":")[0]);

      // Gece yarısından sonraki saatler için düzeltme
      const adjustedStartHour = startHour;
      let adjustedEndHour = endHour;
      let adjustedCurrentHour = currentHour;

      // Gece yarısından sonraki saatler için düzeltme (00, 01, 02)
      if (endHour >= 0 && endHour <= 2) {
        adjustedEndHour = endHour + 24;
      }

      // Eğer rezervasyon akşam saatlerinden gece yarısından sonraya kadar sürüyorsa
      if (startHour > endHour && endHour <= 2) {
        adjustedEndHour = endHour + 24;
      }

      // Mevcut saat için kontrol (07-24 arası normal, 00-02 arası +24)
      if (currentHour >= 0 && currentHour <= 2) {
        adjustedCurrentHour = currentHour + 24;
      }

      return (
        adjustedStartHour <= adjustedCurrentHour &&
        adjustedEndHour > adjustedCurrentHour
      );
    });

    // Toplam misafir sayısını hesapla
    return filteredReservations.reduce(
      (total, reservation) => total + reservation.guestCount,
      0
    );
  };

  // Belirli bir saat için toplam misafir sayısını getir
  const getGuestCountForHour = (hour: string) => {
    return getGuestCountForTimeSlot(hour, reservations);
  };

  // Rezervasyon pozisyonunu hesapla - Tamamen basitleştirilmiş versiyon
  const getReservationPosition = (
    startTime: string,
    endTime: string
  ): { left: string; width: string } => {
    try {
      console.log("Pozisyon hesaplanıyor:", startTime, endTime);

      // Saatleri ve dakikaları ayır - eğer tarih+saat formatında ise sadece saat kısmını al
      let startTimeStr = startTime;
      let endTimeStr = endTime;

      // Tarih+saat formatı kontrolü (yyyy-MM-dd HH:mm veya yyyy-MM-ddTHH:mm formatı olabilir)
      if (startTime.includes(" ")) {
        startTimeStr = startTime.split(" ")[1]; // "yyyy-MM-dd HH:mm" -> "HH:mm"
      } else if (startTime.includes("T")) {
        startTimeStr = startTime.split("T")[1].substring(0, 5); // "yyyy-MM-ddTHH:mm:ss" -> "HH:mm"
      }

      if (endTime.includes(" ")) {
        endTimeStr = endTime.split(" ")[1]; // "yyyy-MM-dd HH:mm" -> "HH:mm"
      } else if (endTime.includes("T")) {
        endTimeStr = endTime.split("T")[1].substring(0, 5); // "yyyy-MM-ddTHH:mm:ss" -> "HH:mm"
      }

      console.log("Saat stringleri:", startTimeStr, endTimeStr);

      // Saatleri ve dakikaları ayır
      const [startHourStr, startMinuteStr] = startTimeStr.split(":");
      const [endHourStr, endMinuteStr] = endTimeStr.split(":");

      // String değerlerini sayıya çevir
      const startHour = parseInt(startHourStr);
      const startMinute = parseInt(startMinuteStr);
      const endHour = parseInt(endHourStr);
      const endMinute = parseInt(endMinuteStr);

      console.log(
        "Saat değerleri:",
        startHour,
        startMinute,
        endHour,
        endMinute
      );

      // Saatlerin grid'deki konumlarını doğrudan hesapla
      let startColumnIndex = -1;
      let endColumnIndex = -1;

      // Gece yarısını geçen saatler için düzeltme (23, 24, 01, 02 saat için)
      if (startHour >= 7 && startHour <= 24) {
        // Normal çalışma saatleri: 7-24 arası
        startColumnIndex = startHour - 7; // 7 => 0, 8 => 1, ... 24 => 17
      } else if (startHour >= 1 && startHour <= 2) {
        // Gece yarısından sonraki saatler: 1-2 arası
        startColumnIndex = 18 + (startHour - 1); // 1 => 18, 2 => 19
      }

      if (endHour >= 7 && endHour <= 24) {
        // Normal çalışma saatleri: 7-24 arası
        endColumnIndex = endHour - 7; // 7 => 0, 8 => 1, ... 24 => 17
      } else if (endHour >= 1 && endHour <= 2) {
        // Gece yarısından sonraki saatler: 1-2 arası
        endColumnIndex = 18 + (endHour - 1); // 1 => 18, 2 => 19
      }

      console.log("Hesaplanan indeksler:", startColumnIndex, endColumnIndex);

      // Eğer indeksler bulunamadıysa hata durumu
      if (startColumnIndex === -1 || endColumnIndex === -1) {
        console.error("Saat indeksleri bulunamadı", startTime, endTime);
        return { left: "0px", width: "80px" };
      }

      // Gece yarısını geçen rezervasyonlar için özel durum
      // Örneğin: 23:00 - 01:00
      if (startHour > endHour) {
        console.log("Gece yarısını geçen rezervasyon tespit edildi");
        // Endeks düzeltme işlemi zaten yukarıda yapıldı
      }

      // Başlangıç soldan pozisyonu
      const startPosition =
        startColumnIndex * cellWidth + (startMinute / 60) * cellWidth;

      console.log("Hesaplanan başlangıç pozisyonu:", startPosition);

      // Genişlik hesabı
      let width;

      if (endColumnIndex >= startColumnIndex) {
        // Normal durum - aynı gün içinde biten rezervasyon
        const columnSpan = endColumnIndex - startColumnIndex;
        width =
          columnSpan * cellWidth +
          (endMinute / 60) * cellWidth -
          (startMinute / 60) * cellWidth;
      } else {
        // Gece yarısını geçen durumlar için (bu durumda artık girmeyecek çünkü yukarıda düzelttik)
        const columnSpan = hours.length - startColumnIndex + endColumnIndex;
        width =
          columnSpan * cellWidth +
          (endMinute / 60) * cellWidth -
          (startMinute / 60) * cellWidth;
      }

      console.log("Hesaplanan genişlik:", width);

      // Minimum genişlik kontrolü
      const finalWidth = Math.max(width, 80); // En az 80px genişlik

      // Sonuç
      const result = {
        left: `${startPosition}px`,
        width: `${finalWidth}px`,
      };

      console.log("Sonuç pozisyon:", result);

      return result;
    } catch (error) {
      console.error("Rezervasyon pozisyonu hesaplanamadı:", error);
      return { left: "0px", width: "80px" };
    }
  };

  // Rezervasyon verilerini yerel depolama alanından yükleme
  useEffect(() => {
    // Netlify dağıtımı ve SSG aşamasında atlanacak
    if (
      process.env.NEXT_PUBLIC_NETLIFY_DEPLOYMENT === "true" &&
      process.env.NEXT_PUBLIC_SKIP_SSG_ADMIN === "true" &&
      typeof window === "undefined"
    ) {
      return;
    }

    // localStorage'dan garson verilerini yükle
    const savedStaff = localStorage.getItem("staff");
    if (savedStaff) {
      try {
        setStaff(JSON.parse(savedStaff));
      } catch (error) {
        console.error("Garson verileri yüklenirken hata oluştu:", error);
      }
    }

    // localStorage'dan rezervasyonları yükle
    const savedReservations = localStorage.getItem("reservations");
    if (savedReservations) {
      try {
        const parsedReservations = JSON.parse(savedReservations);
        setReservations(parsedReservations);
        console.log("Rezervasyonlar yüklendi:", parsedReservations.length);
      } catch (error) {
        console.error("Rezervasyon yükleme hatası:", error);
      }
    } else {
      // localStorage'da rezervasyon yoksa varsayılan örnek verileri yükle ve kaydet
      // Burada örnek verilerimiz olabilir ve localStorage'a kaydedebiliriz
      const defaultReservations: ReservationType[] = [
        {
          id: "res-1",
          tableId: "t1",
          customerName: "Ahmet Yılmaz",
          guestCount: 4,
          startTime: "2023-05-15 12:00",
          endTime: "2023-05-15 13:00",
          status: "confirmed",
          note: "Doğum günü kutlaması",
          staffIds: ["s1", "s2"],
        },
        {
          id: "res-2",
          tableId: "t3",
          customerName: "Mehmet Demir",
          guestCount: 2,
          startTime: "2023-05-15 13:30",
          endTime: "2023-05-15 15:30",
          status: "confirmed",
          staffIds: ["s2"],
        },
        {
          id: "res-3",
          tableId: "t2",
          customerName: "Ayşe Kaya",
          guestCount: 6,
          startTime: "2023-05-15 19:00",
          endTime: "2023-05-15 21:30",
          status: "confirmed",
          staffIds: ["s1", "s3"],
        },
      ];

      setReservations(defaultReservations);
      localStorage.setItem("reservations", JSON.stringify(defaultReservations));
      console.log("Varsayılan rezervasyonlar yüklendi");
    }
  }, []);

  // Rezervasyona tıklandığında
  const handleReservationClick = (reservation: ReservationType) => {
    setSelectedReservation(reservation);
    setIsRightSidebarOpen(true);
    // Tıklandığında artık sidebarClicked durumunu true yap
    setSidebarClicked(true);
  };

  // Hover yönetimi için global bir referans değişkeni ekleyelim
  // Bu özellikle kartlar arası geçişlerde stabilite sağlayacak
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Yeni eklenen rezervasyon referansı - animasyon için
  const newReservationRef = useRef<string | null>(null);

  // Boş hücre için hover state'i - ARTIK GEREKLİ DEĞİL, KALDIRIYORUZ
  // const [hoveredEmptyCell, setHoveredEmptyCell] = useState<{tableId: string, hour: string} | null>(null);

  // NOT: Hover işlemleriyle ilgili fonksiyonlar artık kullanılmıyor ama API uyumluluğu için tutuyoruz
  const handleReservationHover = (reservation: ReservationType) => {
    // Hover fonksiyonu artık kullanılmıyor, sadece API uyumluluğu için burada tutuldu
  };

  // Hover durumu bittiğinde - Hemen kapat
  const handleReservationLeave = () => {
    // Hover fonksiyonu artık kullanılmıyor, sadece API uyumluluğu için burada tutuldu
  };

  // Boş bir hücreye tıklandığında yeni rezervasyon oluşturma işlemi başlatır
  const handleEmptyCellClick = (
    tableId: string,
    hour: string,
    clientX?: number,
    cellRect?: DOMRect
  ) => {
    // Saati ve masayı debug için logla
    console.log(`Boş hücreye tıklama - Masa: ${tableId}, Saat: ${hour}`);

    // Masa kapasitesini kontrol et
    const table = tables.find((t) => t.id === tableId);
    if (!table) {
      toast.error("Masa bulunamadı!");
      return;
    }

    // Masa kapasitesi kontrolü
    if (table.capacity < 2) {
      toast.error("Bu masa rezervasyon için çok küçük!");
      return;
    }

    // Kırmızı çizgiyle kesişimi kontrol et ve başlangıç saatini belirle
    let startTimeStr = hour;

    // Kırmızı çizginin bulunduğu hücreyi kontrol et ve tıklama pozisyonunu hesapla
    const intersection = getCellRedLineIntersection(hour);

    // Eğer kırmızı çizgi bu hücrede ve tıklama pozisyonu ve cellRect bilgileri sağlanmışsa
    if (
      intersection.intersects &&
      clientX &&
      cellRect &&
      intersection.position
    ) {
      // Hücrenin sol kenarından itibaren tıklama pozisyonunu hesapla (0-1 arası)
      const clickPositionRatio = (clientX - cellRect.left) / cellRect.width;

      // Eğer kırmızı çizginin soluna tıklandıysa geçmiş saat için rezervasyon yapılmasına izin verme
      if (clickPositionRatio <= intersection.position) {
        toast.error("Geçmiş saat için rezervasyon yapamazsınız!");
        return;
      }

      // Kırmızı çizginin sağına tıklanmışsa, şu anki saatten başlayan rezervasyon oluştur
      startTimeStr = getCurrentTimeString();
    } else if (isTimePast(hour)) {
      // Kırmızı çizgi hücrede değil ama saat geçmişse rezervasyon yapma
      toast.error("Geçmiş saat için rezervasyon yapamazsınız!");
      return;
    }

    // Bu masa ve saatte işlem yapılıyor mu kontrol et - farklı günlerdeki aynı saatlere izin veriyoruz
    // Tarih ekleyerek tam karşılaştırma yapalım
    const currentDateStr = format(selectedDate, "yyyy-MM-dd");
    const isTableBeingProcessed = activeForms.some((form) => {
      if (form.tableId !== tableId) return false;

      // Form ve yeni rezervasyon için tam tarih-saat bilgilerini oluştur
      const formTimeWithDate =
        form.startTime.includes(" ") || form.startTime.includes("T")
          ? form.startTime
          : `${currentDateStr} ${form.startTime}`;

      const startTimeWithDate =
        startTimeStr.includes(" ") || startTimeStr.includes("T")
          ? startTimeStr
          : `${currentDateStr} ${startTimeStr}`;

      // Tarih kısımlarını ayıkla
      const formDate = formTimeWithDate.includes(" ")
        ? formTimeWithDate.split(" ")[0]
        : formTimeWithDate.split("T")[0];

      const newDate = startTimeWithDate.includes(" ")
        ? startTimeWithDate.split(" ")[0]
        : startTimeWithDate.split("T")[0];

      // Saat kısımlarını ayıkla
      let formTime = "";
      if (form.startTime.includes(" ")) {
        formTime = form.startTime.split(" ")[1];
      } else if (form.startTime.includes("T")) {
        formTime = form.startTime.split("T")[1].substring(0, 5);
      } else {
        formTime = form.startTime;
      }

      let newTime = "";
      if (startTimeStr.includes(" ")) {
        newTime = startTimeStr.split(" ")[1];
      } else if (startTimeStr.includes("T")) {
        newTime = startTimeStr.split("T")[1].substring(0, 5);
      } else {
        newTime = startTimeStr;
      }

      console.log(
        `İşlem kontrolü: Form tarih=${formDate}, Form saat=${formTime}, Yeni tarih=${newDate}, Yeni saat=${newTime}`
      );

      // İŞLEM KONTROLÜ: Aynı masa ve aynı saat, AYNI TARİHTE ise çakışma vardır
      // Farklı tarihlerde aynı masa ve saate izin veriyoruz
      return (
        form.tableId === tableId && // Aynı masa
        formDate === newDate && // Aynı tarih (ÖNEMLİ: farklı tarihlerde çakışma olmaz)
        formTime === newTime // Aynı saat
      );
    });

    if (isTableBeingProcessed) {
      console.log(
        "ÇAKIŞMA TESPİT EDİLDİ: Bu masa ve saat için başka bir işlem devam ediyor"
      );
      toast.error("Bu masa ve saat için başka bir işlem devam ediyor!");
      return;
    } else {
      console.log("ÇAKIŞMA YOK: Bu masa ve saat için işlem yapılabilir");
    }

    // Bitiş saatini hesapla (başlangıç + 1 saat)
    const startHourMinute = startTimeStr.split(":");
    const startHour = parseInt(startHourMinute[0]);
    const startMinute = parseInt(startHourMinute[1]);

    // Dakikaları da dikkate alarak 1 saat sonrası için bitiş zamanını hesapla
    let endHour = startHour + 1;
    if (endHour >= 24) endHour -= 24; // 24 saati geçerse sıfırla

    const endTimeStr = `${endHour.toString().padStart(2, "0")}:${startMinute
      .toString()
      .padStart(2, "0")}`;

    // Çakışma kontrolü
    console.log(
      "Çakışma kontrolü yapılıyor:",
      tableId,
      startTimeStr,
      endTimeStr,
      "Tarih:",
      currentDateStr
    );

    const conflict = reservations.some((res) => {
      // Aynı masa için ve aynı gün için çakışma kontrolü yap
      if (res.tableId === tableId) {
        // Seçilen günün tarih formatı
        const currentDateStr = format(selectedDate, "yyyy-MM-dd");

        // Rezervasyon tarihini kontrol et
        const reservationDateStr = res.startTime.includes(" ")
          ? res.startTime.split(" ")[0] // "yyyy-MM-dd HH:mm" -> "yyyy-MM-dd"
          : res.startTime.includes("T")
          ? res.startTime.split("T")[0] // "yyyy-MM-ddTHH:mm" -> "yyyy-MM-dd"
          : currentDateStr; // Tarih yoksa şu anki günü kullan

        console.log(
          `Rezervasyon tarihi: ${reservationDateStr}, Seçilen tarih: ${currentDateStr}`
        );

        // Sadece aynı gün için kontrol et - farklı günlerde çakışma olmamalı
        if (reservationDateStr === currentDateStr) {
          const hasOverlap = hasTimeOverlap(
            startTimeStr,
            endTimeStr,
            res.startTime,
            res.endTime
          );

          console.log(
            `Çakışma kontrolü: ${hasOverlap ? "ÇAKIŞMA VAR" : "çakışma yok"}`
          );
          return hasOverlap;
        }
      }
      return false;
    });

    if (conflict) {
      toast.error("Bu masa ve saatte zaten bir rezervasyon var!");
      return;
    }

    // Varsayımsal rezervasyon oluştur
    const tempReservation: ReservationType = {
      id: "temp",
      tableId: tableId,
      customerName: "",
      guestCount: 2, // Varsayılan 2 kişi
      startTime: startTimeStr,
      endTime: endTimeStr, // 1 saat süre varsayılan
      status: "pending",
    };

    // Yeni bir işlem ekle
    const newForm = {
      id: `form-${Date.now()}`,
      tableId,
      startTime: startTimeStr,
      endTime: endTimeStr,
      customerName: "Yeni Müşteri",
      guestCount: 2,
      lastActivity: new Date(),
      status: "filling_form" as
        | "filling_form"
        | "selecting_table"
        | "completing",
    };

    // Aktif formlar listesine ekle
    setActiveForms((prev) => [...prev, newForm]);

    console.log(
      `Yeni form oluşturuldu: ID=${newForm.id}, Masa=${tableId}, Tarih=${currentDateStr}, Saat=${startTimeStr}`
    );

    // Rezervasyonu seç
    setSelectedReservation(tempReservation);

    // Sidebar'ı aç
    setIsRightSidebarOpen(true);
    setSidebarClicked(true);
    setSidebarOpenedByHover(false);
  };

  // Rezervasyon zamanları çakışma kontrolü
  const hasTimeOverlap = (
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean => {
    // Sadece saat kısmını alıyoruz
    const extractTimeOnly = (timeStr: string): string => {
      // Eğer timeStr içinde boşluk varsa, bu tarih + saat formatıdır
      if (timeStr.includes(" ")) {
        return timeStr.split(" ")[1]; // "yyyy-MM-dd HH:mm" -> "HH:mm"
      } else if (timeStr.includes("T")) {
        // ISO formatını saat kısmına dönüştür
        const timePart = timeStr.split("T")[1];
        // Saniye ve milisaniye kısmını kaldır
        return timePart.substring(0, 5); // "yyyy-MM-ddTHH:mm:ss" -> "HH:mm"
      }
      return timeStr; // Zaten saat formatındaysa olduğu gibi bırak
    };

    // Saatleri dakikaya çevir
    const convertTimeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(":").map(Number);
      return hours * 60 + minutes;
    };

    // Önce saat kısımlarını çıkar
    const timeOnly1 = extractTimeOnly(start1);
    const timeOnly2 = extractTimeOnly(end1);
    const timeOnly3 = extractTimeOnly(start2);
    const timeOnly4 = extractTimeOnly(end2);

    // Sonra dakikaya çevir
    const start1Min = convertTimeToMinutes(timeOnly1);
    const end1Min = convertTimeToMinutes(timeOnly2);
    const start2Min = convertTimeToMinutes(timeOnly3);
    const end2Min = convertTimeToMinutes(timeOnly4);

    // Gece yarısını geçen rezervasyonlar için düzeltme
    const adjustedEnd1Min = end1Min <= start1Min ? end1Min + 24 * 60 : end1Min;
    const adjustedEnd2Min = end2Min <= start2Min ? end2Min + 24 * 60 : end2Min;

    // Debug log ekleyelim
    console.log("Çakışma kontrolü:", {
      start1: timeOnly1,
      end1: timeOnly2,
      start2: timeOnly3,
      end2: timeOnly4,
      start1Min,
      end1Min,
      start2Min,
      end2Min,
      adjustedEnd1Min,
      adjustedEnd2Min,
    });

    // Çakışma kontrolü: iki zaman aralığı çakışıyorsa true döndür
    const hasOverlap =
      (start1Min < adjustedEnd2Min && adjustedEnd1Min > start2Min) ||
      (start2Min < adjustedEnd1Min && adjustedEnd2Min > start1Min);

    console.log(`Çakışma sonucu: ${hasOverlap ? "VAR" : "YOK"}`);
    return hasOverlap;
  };

  // Sidebar tıklama durumu
  const handleSidebarClick = () => {
    setSidebarClicked(true);
    setSidebarOpenedByHover(false); // Artık hover değil, tıklama kontrol ediyor
  };

  // ESC tuşu ile kapatma
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isRightSidebarOpen) {
        setIsRightSidebarOpen(false);
        setSidebarOpenedByHover(false);
        setSidebarClicked(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRightSidebarOpen]);

  // Sağ paneli kapat
  const closeRightSidebar = () => {
    setIsRightSidebarOpen(false);
    setSelectedReservation(null);
    setSidebarOpenedByHover(false);
    setSidebarClicked(false);

    console.log("Sağ panel kapatıldı ve form temizlendi");
  };

  // sidebar durumlarını izlemek için state ekle
  const [sidebarOpenedByHover, setSidebarOpenedByHover] = useState(false);
  const [sidebarClicked, setSidebarClicked] = useState(false);

  // Aktif rezervasyon formlarını izle ve görüntüle
  const [activeForms, setActiveForms] = useState<ActiveFormType[]>([]);

  // Masalar için state
  const [tables, setTables] = useState<TableType[]>([]);

  // Masaları yükleme fonksiyonu
  const loadTables = async () => {
    try {
      // Realtime Database'den masaları yükle
      const tablesRef = ref(db, "tables");
      const tablesSnapshot = await get(tablesRef);

      if (tablesSnapshot.exists()) {
        const tablesData = tablesSnapshot.val();
        const loadedTables = Object.entries(tablesData).map(
          ([id, data]: [string, any]) => {
            return {
              id,
              number: data.number || 0,
              capacity: data.capacity || 2,
              categoryId: data.category_id || "1",
              status: data.status === "active" ? "Available" : "Unavailable",
            } as TableType;
          }
        );

        setTables(loadedTables);
        console.log("Masalar Firebase'den yüklendi:", loadedTables.length);
      } else {
        // Varsayılan masa verileri
        const defaultTables: TableType[] = [
          // TERAS kategorisindeki masalar
          {
            id: uuidv4(),
            number: 1,
            capacity: 2,
            categoryId: "1",
            status: "Available",
          },
          {
            id: uuidv4(),
            number: 2,
            capacity: 4,
            categoryId: "1",
            status: "Available",
          },
          {
            id: uuidv4(),
            number: 3,
            capacity: 6,
            categoryId: "1",
            status: "Available",
          },
          {
            id: uuidv4(),
            number: 4,
            capacity: 8,
            categoryId: "1",
            status: "Available",
          },
          {
            id: uuidv4(),
            number: 5,
            capacity: 2,
            categoryId: "1",
            status: "Available",
          },

          // BAHÇE kategorisindeki masalar
          {
            id: uuidv4(),
            number: 6,
            capacity: 2,
            categoryId: "2",
            status: "Available",
          },
          {
            id: uuidv4(),
            number: 7,
            capacity: 4,
            categoryId: "2",
            status: "Available",
          },
          {
            id: uuidv4(),
            number: 8,
            capacity: 6,
            categoryId: "2",
            status: "Available",
          },
          {
            id: uuidv4(),
            number: 9,
            capacity: 8,
            categoryId: "2",
            status: "Available",
          },

          // İÇ SALON kategorisindeki masalar
          {
            id: uuidv4(),
            number: 10,
            capacity: 2,
            categoryId: "3",
            status: "Available",
          },
          {
            id: uuidv4(),
            number: 11,
            capacity: 4,
            categoryId: "3",
            status: "Available",
          },
          {
            id: uuidv4(),
            number: 12,
            capacity: 6,
            categoryId: "3",
            status: "Available",
          },
          {
            id: uuidv4(),
            number: 13,
            capacity: 8,
            categoryId: "3",
            status: "Available",
          },
        ];

        // Varsayılan masaları Firebase'e kaydet
        for (const table of defaultTables) {
          await addDoc(collection(db, "tables"), {
            number: table.number,
            capacity: table.capacity,
            category_id: table.categoryId,
            status: table.status === "Available" ? "active" : "inactive",
            createdAt: Timestamp.now(),
          });
        }

        // Firebase'den tekrar yükle
        loadTables();
      }
    } catch (error) {
      console.error("Masa verilerini yükleme hatası:", error);
      toast.error("Masa verileri yüklenirken bir hata oluştu.");
    }
  };

  // Socket.IO bağlantısı için
  useEffect(() => {
    // SSR/SSG sırasında çalıştırma
    if (typeof window === "undefined") return;

    // Gerçek zamanlı müşteri rezervasyon bildirimleri
    const setupReservationConflictNotifications = () => {
      // Bildirim sistemini devre dışı bıraktık
      return () => {}; // boş cleanup fonksiyonu
    };

    // Bildirim sistemini başlat
    const cleanup = setupReservationConflictNotifications();
    return cleanup;
  }, [isRightSidebarOpen, selectedReservation, activeForms]);

  // Ana içeriğe başlamadan önce aktif rezervasyonları göster
  const ActiveReservations = () => {
    // Bildirimleri devre dışı bırakıyoruz
    return null;
  };

  // Masa kapasitesi kontrolü - belirli bir masanın misafir sayısı için yeterli olup olmadığını kontrol eder
  const isTableCapacitySufficient = (
    tableId: string,
    guestCount: number
  ): boolean => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return false;
    return table.capacity >= guestCount;
  };

  // Birleştirilebilecek masaları bul - yakındaki boş ve yeterli kapasiteye sahip masaları döndürür
  const findMergableTables = (
    tableId: string,
    guestCount: number
  ): TableType[] => {
    const currentTable = tables.find((t) => t.id === tableId);
    if (!currentTable) return [];

    // Aynı kategorideki masaları bul
    const tablesInSameCategory = tables.filter(
      (t) =>
        t.id !== tableId &&
        t.categoryId === currentTable.categoryId &&
        t.capacity + currentTable.capacity >= guestCount
    );

    // Masaları uzaklığa göre filtrele (örnek: aynı bölgedeki masalar)
    // Bu basit bir implementasyon - daha karmaşık bir yakınlık algoritması gerekebilir
    return tablesInSameCategory.slice(0, 3); // Sadece ilk 3 uygun masayı öner
  };

  // Masa ve zaman çakışma kontrolü
  const hasTableConflict = (
    tableId: string,
    startTime: string,
    endTime: string,
    excludeReservationId?: string
  ): boolean => {
    console.log("Çakışma kontrolü:", {
      tableId,
      startTime,
      endTime,
      excludeId: excludeReservationId,
    });

    // Aynı masa için rezervasyonları filtrele (belirtilen rezervasyon hariç)
    const reservationsForTable = reservations.filter(
      (r) =>
        r.tableId === tableId &&
        (excludeReservationId ? r.id !== excludeReservationId : true)
    );

    if (reservationsForTable.length === 0) {
      console.log("Masada hiç rezervasyon yok, çakışma kontrolüne gerek yok");
      return false; // Masada hiç rezervasyon yoksa, çakışma da yok
    }

    // İşlem yapılan rezervasyon tarihini çıkart
    const getDateFromTime = (timeStr: string): string => {
      if (timeStr.includes(" ")) {
        return timeStr.split(" ")[0]; // "yyyy-MM-dd HH:mm" -> "yyyy-MM-dd"
      } else if (timeStr.includes("T")) {
        return timeStr.split("T")[0]; // "yyyy-MM-ddTHH:mm:ss" -> "yyyy-MM-dd"
      }
      // Eğer tarih kısmı yoksa, aktif seçili tarihi kullan
      return format(selectedDate, "yyyy-MM-dd");
    };

    // Çakışma kontrolü yapılacak rezervasyonun tarih bilgisi
    const checkDate = getDateFromTime(startTime);
    console.log("Kontrol edilen tarih:", checkDate);

    // Çakışma kontrolü
    const hasConflict = reservationsForTable.some((r) => {
      // Rezervasyonun tarihini kontrol et
      const reservationDate = getDateFromTime(r.startTime);
      console.log(`Rezervasyon (${r.id}) tarihi:`, reservationDate);

      // Farklı günlerde çakışma olmaz
      if (reservationDate !== checkDate) {
        console.log(
          `Farklı günler: işlem yapılan=${checkDate}, mevcut=${reservationDate} - çakışma yok`
        );
        return false;
      }

      // Aynı gün içinde çakışma kontrolü
      const hasOverlap = hasTimeOverlap(
        startTime,
        endTime,
        r.startTime,
        r.endTime
      );

      if (hasOverlap) {
        console.log(
          `ÇAKIŞMA BULUNDU: ${r.id} (${r.customerName}) - ${r.startTime} ile ${r.endTime} arasında`
        );
      }

      return hasOverlap;
    });

    return hasConflict;
  };

  // Tarih saat standart formata çevirme yardımcı fonksiyonu
  const standardizeDateTime = (
    dateTimeStr: string,
    selectedDate: Date
  ): string => {
    console.log("Standardize ediliyor:", dateTimeStr);

    // Sadece saat formatı ise (HH:MM veya HH:MM:SS)
    if (!dateTimeStr.includes(" ") && !dateTimeStr.includes("T")) {
      const formattedDate = format(selectedDate, "yyyy-MM-dd");
      const result = `${formattedDate}T${dateTimeStr.substring(0, 5)}:00`;
      console.log("Saat formatından ISO'ya:", result);
      return result;
    }

    // "yyyy-MM-dd HH:MM" formatı ise
    if (dateTimeStr.includes(" ")) {
      const [datePart, timePart] = dateTimeStr.split(" ");
      const result = `${datePart}T${timePart.substring(0, 5)}:00`;
      console.log("Boşluklu formattan ISO'ya:", result);
      return result;
    }

    // Zaten ISO formatında ise (ama belki Z'siz veya milisaniyesiz)
    if (dateTimeStr.includes("T")) {
      // Z kısmını kaldır
      const withoutZ = dateTimeStr.split("Z")[0];
      // Sadece ilk 19 karakteri al (yyyy-MM-ddTHH:mm:ss) - milisaniyeleri kaldır
      const sanitized = withoutZ.substring(0, 19);

      // Eğer eksik karakterler varsa tamamla
      if (sanitized.length < 19) {
        if (sanitized.length === 16) {
          // yyyy-MM-ddTHH:mm
          const result = `${sanitized}:00`;
          console.log("Eksik saniyeli ISO'yu tamamlama:", result);
          return result;
        }
      }

      console.log("Zaten ISO formatında:", sanitized);
      return sanitized;
    }

    // Bilinmeyen format, olduğu gibi döndür
    console.warn("Bilinmeyen tarih formatı:", dateTimeStr);
    return dateTimeStr;
  };

  const updateReservation = async (
    updatedReservation: ReservationType,
    oldReservation?: ReservationType
  ) => {
    try {
      console.log("Rezervasyonu güncelleme başladı:", updatedReservation);
      console.log(
        `İşlem türü: ${
          updatedReservation.id === "temp" ? "YENİ REZERVASYON" : "GÜNCELLEME"
        }`
      );
      console.log(`Aktif tarih: ${format(selectedDate, "yyyy-MM-dd")}`);

      // Debug için daha fazla detay
      console.log("REZERVASYON DETAYLARI:", {
        id: updatedReservation.id,
        masa: updatedReservation.tableId,
        müşteri: updatedReservation.customerName,
        başlangıçSaati: updatedReservation.startTime,
        bitişSaati: updatedReservation.endTime,
        tarih: updatedReservation.startTime.includes(" ")
          ? updatedReservation.startTime.split(" ")[0]
          : updatedReservation.startTime.includes("T")
          ? updatedReservation.startTime.split("T")[0]
          : "belirsiz",
      });

      // Eğer eski rezervasyon bilgisi varsa, son işlem olarak kaydet
      if (oldReservation && updatedReservation.id !== "temp") {
        setLastOperation({
          type:
            oldReservation.tableId !== updatedReservation.tableId
              ? "move"
              : oldReservation.startTime !== updatedReservation.startTime ||
                oldReservation.endTime !== updatedReservation.endTime
              ? "resize"
              : "update",
          oldReservation: { ...oldReservation },
          newReservation: { ...updatedReservation },
        });
      }

      // Seçilen masa bilgisini kontrol et
      const selectedTable = tables.find(
        (t) => t.id === updatedReservation.tableId
      );
      if (!selectedTable) {
        console.error("Seçilen masa bulunamadı:", updatedReservation.tableId);
        toast.error("Seçilen masa bulunamadı. Lütfen başka bir masa seçin.");
        return;
      }

      // Yeni rezervasyon mu yoksa güncelleme mi kontrolü
      const isNewReservation = updatedReservation.id === "temp";

      // Seçilen tarihi al (farklı günlerde doğru tarih kullanmak için)
      const formattedDate = format(selectedDate, "yyyy-MM-dd");
      console.log(`Rezervasyon için tarih: ${formattedDate}`);

      // Başlangıç ve bitiş saatlerini standarize et (ISO formatı)
      updatedReservation.startTime = standardizeDateTime(
        updatedReservation.startTime,
        selectedDate
      );
      updatedReservation.endTime = standardizeDateTime(
        updatedReservation.endTime,
        selectedDate
      );

      console.log("Standart başlangıç saati:", updatedReservation.startTime);
      console.log("Standart bitiş saati:", updatedReservation.endTime);

      if (isNewReservation) {
        // Yeni rezervasyon eklendiğinde
        console.log("Yeni rezervasyon ekleniyor...");
        console.log(`Seçilen tarih: ${format(selectedDate, "yyyy-MM-dd")}`);

        // Müşteri adı kontrolü
        if (!updatedReservation.customerName.trim()) {
          toast.error("Lütfen müşteri adını giriniz.");
          return;
        }

        // Benzersiz ID oluştur
        const newId = `res-${Date.now()}`;

        // Firebase için rezervasyon verilerini hazırla
        const startTime = new Date(updatedReservation.startTime);
        const endTime = new Date(updatedReservation.endTime);

        const reservationData = {
          table_id: updatedReservation.tableId,
          customer_name: updatedReservation.customerName,
          guest_count: updatedReservation.guestCount,
          start_time: Timestamp.fromDate(startTime),
          end_time: Timestamp.fromDate(endTime),
          status: updatedReservation.status as
            | "confirmed"
            | "pending"
            | "cancelled"
            | "completed",
          note: updatedReservation.note || "",
          color: updatedReservation.color || "",
          staff_ids: updatedReservation.staffIds || [],
          created_at: Timestamp.now(),
          updated_at: Timestamp.now(),
        };

        // Firebase'e kaydet
        const newReservationRef = await addDoc(
          collection(db, "reservations"),
          reservationData
        );

        // Yeni rezervasyon objesi - oluşturduğumuz ID ile
        const newReservation = {
          ...updatedReservation,
          id: newId,
        };

        console.log("Yeni rezervasyon oluşturuldu:", newReservation);
        console.log(
          `Oluşturulan rezervasyon tarihi: ${
            newReservation.startTime.includes(" ")
              ? newReservation.startTime.split(" ")[0]
              : newReservation.startTime.includes("T")
              ? newReservation.startTime.split("T")[0]
              : "belirsiz"
          }, Seçilen tarih: ${format(selectedDate, "yyyy-MM-dd")}`
        );

        // Çakışma kontrolü
        if (
          hasTableConflict(
            newReservation.tableId,
            newReservation.startTime,
            newReservation.endTime
          )
        ) {
          toast.error(
            "Bu masa ve saatte başka bir rezervasyon bulunuyor. Lütfen farklı bir saat veya masa seçin."
          );
          return;
        }

        // Kapasite kontrolü
        if (
          !isTableCapacitySufficient(
            newReservation.tableId,
            newReservation.guestCount
          )
        ) {
          toast.error(
            `Masa kapasitesi (${selectedTable.capacity} kişi) yetersiz. Daha büyük bir masa seçin.`
          );
          return;
        }

        // Yeni eklenen rezervasyon ID'sini referansa ata (animasyon için)
        newReservationRef.current = newId;

        // Ekranda görünen rezervasyonları güncelle (sadece seçilen güne ait olanları)
        const updatedReservations = [...reservations, newReservation];
        setReservations(updatedReservations);

        // Başarı mesajı göster ve sidebar'ı kapat
        toast.success("Yeni rezervasyon başarıyla eklendi!");
        closeRightSidebar();

        // Yeni rezervasyona scroll yap (Biraz gecikme ekleyerek DOM'un güncellenmesini bekle)
        setTimeout(() => {
          const reservationElement = document.getElementById(
            `reservation-${newId}`
          );
          if (reservationElement) {
            // Rezervasyon elemanını görünür alana getir
            reservationElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });

            // Dikkat çekmek için animasyon sınıfı ekle
            reservationElement.classList.add("highlight-new-reservation");

            // Animasyonu bir süre sonra kaldır
            setTimeout(() => {
              reservationElement.classList.remove("highlight-new-reservation");
              // Referansı temizle
              newReservationRef.current = null;
            }, 5000); // 5 saniye sonra animasyonu kaldır
          }
        }, 300);
      } else {
        // Mevcut rezervasyon güncellendiğinde
        // Önceki rezervasyonu bul
        const oldReservation = reservations.find(
          (r) => r.id === updatedReservation.id
        );
        if (!oldReservation) {
          console.error(
            "Güncellenecek rezervasyon bulunamadı:",
            updatedReservation.id
          );
          toast.error("Rezervasyon bulunamadı.");
          return;
        }

        // Kapsamlı debug kaydı
        console.log("\n-------- REZERVASYON GÜNCELLEME ----------");
        console.log(
          `Rezervasyon: ${updatedReservation.id} - ${updatedReservation.customerName}`
        );
        console.log("ESKİ BİLGİLER:");
        console.log(`- Masa: ${oldReservation.tableId}`);
        console.log(
          `- Saat: ${oldReservation.startTime}-${oldReservation.endTime}`
        );
        console.log(`- Kişi: ${oldReservation.guestCount}`);
        console.log("YENİ BİLGİLER:");
        console.log(`- Masa: ${updatedReservation.tableId}`);
        console.log(
          `- Saat: ${updatedReservation.startTime}-${updatedReservation.endTime}`
        );
        console.log(`- Kişi: ${updatedReservation.guestCount}`);
        console.log("----------------------------------------\n");

        // Kapasite kontrolü - Misafir sayısı masa kapasitesinden fazla mı?
        if (
          !isTableCapacitySufficient(
            updatedReservation.tableId,
            updatedReservation.guestCount
          )
        ) {
          // Birleştirilebilecek masa var mı kontrol et
          const mergableTables = findMergableTables(
            updatedReservation.tableId,
            updatedReservation.guestCount
          );

          if (mergableTables.length > 0) {
            // Birleştirilebilecek masalar var, kullanıcıya sor
            const tableNames = mergableTables
              .map((t) => `Masa ${t.number} (${t.capacity} kişilik)`)
              .join(", ");

            const userConfirm = window.confirm(
              `Masa ${selectedTable.number} kapasitesi (${selectedTable.capacity} kişi) yetersiz! ` +
                `Birleştirilebilecek masalar: ${tableNames}\n\n` +
                `Bu masalardan biriyle birleştirmek ister misiniz?`
            );

            if (!userConfirm) {
              toast.error(
                `Masa kapasitesi (${selectedTable.capacity} kişi) yetersiz. Daha büyük bir masa seçin.`
              );
              return;
            }

            // TODO: Masa birleştirme işlemleri burada yapılacak
            toast.success(
              "Masalar birleştirilecek! (Bu özellik henüz yapım aşamasında)"
            );
          } else {
            // Birleştirilebilecek masa yok
            toast.error(
              `Masa kapasitesi (${selectedTable.capacity} kişi) yetersiz. Daha büyük bir masa seçin.`
            );
            return;
          }
        }

        // Zaman ve masa çakışması kontrolü
        // Farklı masaya taşınmış veya zamanı değişmiş ise
        if (
          oldReservation.tableId !== updatedReservation.tableId ||
          oldReservation.startTime !== updatedReservation.startTime ||
          oldReservation.endTime !== updatedReservation.endTime
        ) {
          // Aynı masada aynı saatte çakışan rezervasyon var mı?
          if (
            hasTableConflict(
              updatedReservation.tableId,
              updatedReservation.startTime,
              updatedReservation.endTime,
              updatedReservation.id // Kendi ID'sini hariç tut
            )
          ) {
            toast.error(
              "Bu masa ve saatte başka bir rezervasyon bulunuyor. Lütfen farklı bir saat veya masa seçin."
            );
            return;
          }
        }

        // Kategori değişimi kontrolü
        if (oldReservation.tableId !== updatedReservation.tableId) {
          const oldTable = tables.find((t) => t.id === oldReservation.tableId);
          const newTable = tables.find(
            (t) => t.id === updatedReservation.tableId
          );

          if (oldTable && newTable) {
            // Kategori değişimi oldu mu?
            const oldCategory = tableCategories.find(
              (c) => c.id === oldTable.categoryId
            );
            const newCategory = tableCategories.find(
              (c) => c.id === newTable.categoryId
            );

            if (
              oldCategory &&
              newCategory &&
              oldCategory.id !== newCategory.id
            ) {
              console.log(
                `KATEGORİ DEĞİŞİMİ: ${oldCategory.name} -> ${newCategory.name}`
              );
            }
          }
        }

        // Firebase için rezervasyon verilerini hazırla
        const reservationData = {
          table_id: updatedReservation.tableId,
          customer_name: updatedReservation.customerName,
          guest_count: updatedReservation.guestCount,
          start_time: updatedReservation.startTime,
          end_time: updatedReservation.endTime,
          status: updatedReservation.status as
            | "confirmed"
            | "pending"
            | "cancelled"
            | "completed",
          note: updatedReservation.note,
          color: updatedReservation.color,
        };

        // Firebase'de güncelle
        const startTime = new Date(updatedReservation.startTime);
        const endTime = new Date(updatedReservation.endTime);

        // Güncelleme verisini hazırla
        const updateData = {
          table_id: updatedReservation.tableId,
          customer_name: updatedReservation.customerName,
          guest_count: updatedReservation.guestCount,
          start_time: Timestamp.fromDate(startTime),
          end_time: Timestamp.fromDate(endTime),
          status: updatedReservation.status,
          note: updatedReservation.note || "",
          color: updatedReservation.color || "",
          staff_ids: updatedReservation.staffIds || [],
          updated_at: Timestamp.now(),
        };

        // Firebase belgesini güncelle
        const reservationRef = doc(db, "reservations", updatedReservation.id);
        await updateDoc(reservationRef, updateData);

        // Ekranda görünen rezervasyonları güncelle (sadece seçilen güne ait olanları)
        const updatedReservations = reservations.map((res) => {
          if (res.id === updatedReservation.id) {
            return updatedReservation;
          }
          return res;
        });

        setReservations(updatedReservations);

        // Başarı mesajı göster ve sidebar'ı kapat
        toast.success("Rezervasyon başarıyla güncellendi!");
        closeRightSidebar();
      }
    } catch (error) {
      console.error("Rezervasyon güncellenirken bir hata oluştu:", error);
      toast.error("Rezervasyon güncellenirken beklenmeyen bir hata oluştu.");
    }
  };

  // Rezervasyonu silme fonksiyonu
  const deleteReservation = async (reservationId: string) => {
    try {
      console.log("Rezervasyon silme başladı:", reservationId);

      // Kullanıcıdan onay al
      const userConfirm = window.confirm(
        "Bu rezervasyonu kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
      );

      console.log(
        `Silme işlemi: ${reservationId} ID'li rezervasyon için onay istendi`
      );

      if (!userConfirm) {
        console.log(
          "Rezervasyon silme işlemi kullanıcı tarafından iptal edildi."
        );
        return;
      }

      // Rezervasyonu bul
      const reservationToDelete = reservations.find(
        (r) => r.id === reservationId
      );

      if (!reservationToDelete) {
        console.error("Silinecek rezervasyon bulunamadı:", reservationId);
        toast.error("Rezervasyon bulunamadı.");
        return;
      }

      // Firebase'den rezervasyonu sil
      const reservationRef = doc(db, "reservations", reservationId);
      await deleteDoc(reservationRef);

      // Ekrandaki rezervasyonları güncelle (görünür olanları)
      const updatedReservations = reservations.filter(
        (res) => res.id !== reservationId
      );

      setReservations(updatedReservations);

      // Bildirim göster
      toast.success("Rezervasyon başarıyla silindi!");

      // Sidebar'ı kapat
      closeRightSidebar();
    } catch (error) {
      console.error("Rezervasyon silinirken bir hata oluştu:", error);
      toast.error("Rezervasyon silinirken beklenmeyen bir hata oluştu.");
    }
  };

  // Main content div için mouse leave olayı
  const handleMainContentLeave = () => {
    // Eğer sidebar hover ile açıldıysa ve kullanıcı tıklamadıysa
    if (sidebarOpenedByHover && !sidebarClicked) {
      // Varsa önceki zamanlayıcıyı temizle
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }

      // Yeni bir zamanlayıcı oluştur - içerik alanından tamamen çıkıldığında hemen kapat
      hoverTimeoutRef.current = setTimeout(() => {
        setIsRightSidebarOpen(false);
        setSidebarOpenedByHover(false);
        hoverTimeoutRef.current = null;
      }, 300);
    }
  };

  // Component unmount olduğunda timeout'u temizle
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Ana içerik bölümüne zoom durumu için state değişkenleri ekleyelim
  const [zoomLevel, setZoomLevel] = useState<number>(100); // Yüzde olarak zoom seviyesi
  const maxZoom = 200; // Maksimum zoom seviyesi
  const minZoom = 50; // Minimum zoom seviyesi

  // Grid scroll pozisyonunu merkeze getiren fonksiyon
  const centerGridScroll = () => {
    if (gridContainerRef.current) {
      const gridContainer = gridContainerRef.current;
      const gridContent = gridContainer.querySelector("div");

      if (gridContent) {
        // İçeriğin boyutları
        const contentWidth = gridContent.scrollWidth;
        const contentHeight = gridContent.scrollHeight;

        // Görünüm alanı boyutları
        const viewportWidth = gridContainer.clientWidth;
        const viewportHeight = gridContainer.clientHeight;

        // Merkez noktayı hesapla
        const scrollLeftCenter = (contentWidth - viewportWidth) / 2;
        const scrollTopCenter = (contentHeight - viewportHeight) / 2;

        // Scroll pozisyonunu ayarla
        gridContainer.scrollLeft = scrollLeftCenter;
        gridContainer.scrollTop = scrollTopCenter;
      }
    }
  };

  // Zoom işlemlerini gerçekleştirecek fonksiyonlar
  const handleZoomIn = () => {
    setZoomLevel((prev) => {
      const newZoomLevel = Math.min(prev + 10, maxZoom);
      // Grid container scroll pozisyonunu ayarla
      setTimeout(() => centerGridScroll(), 10);
      return newZoomLevel;
    });
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const newZoomLevel = Math.max(prev - 10, minZoom);
      // Grid container scroll pozisyonunu ayarla
      setTimeout(() => centerGridScroll(), 10);
      return newZoomLevel;
    });
  };

  const handleZoomReset = () => {
    setZoomLevel(100);
    // Varsayılan zoom'da scroll'u sıfırla
    if (gridContainerRef.current) {
      gridContainerRef.current.scrollLeft = 0;
      gridContainerRef.current.scrollTop = 0;
    }
  };

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoomLevel = parseInt(e.target.value);
    setZoomLevel(newZoomLevel);
    // Zoom değişikliği sonrası scroll pozisyonunu ayarla
    setTimeout(() => centerGridScroll(), 10);
  };

  // Zoom seviyesini uygula
  useEffect(() => {
    if (gridContainerRef.current) {
      // Ref'i daha kolay kullanmak için değişkene atayalım
      const gridContainer = gridContainerRef.current;

      // Grid içeriğinin container'ını bulalım
      const gridContent = gridContainer.querySelector("div");
      if (gridContent) {
        // Transform origin'i ortaya alalım ki zoom merkeze göre yapılsın
        gridContent.style.transformOrigin = "center";
        gridContent.style.transform = `scale(${zoomLevel / 100})`;

        // Minimum genişliği belirleyerek, küçültme durumunda bile tüm içeriğin görünmesini sağlayalım
        if (zoomLevel < 100) {
          // Eğer küçültüyorsak, içeriğin tamamen görünür olması için min-width verilebilir
          gridContent.style.minWidth = "100%";
        } else {
          // Grid content genişliği en az viewportun %100'ü kadar olsun
          gridContent.style.minWidth = `${zoomLevel}%`;
        }

        // Büyültme durumunda gridContainer'ın scrollbar'larını etkinleştirelim
        gridContainer.style.overflowX = "auto";
        gridContainer.style.overflowY = "auto";

        // İlk yüklemede scroll pozisyonunu merkeze getirmek için
        if (zoomLevel > 100) {
          const scrollLeftCenter =
            (gridContent.scrollWidth * (zoomLevel / 100 - 1)) / 2;
          const scrollTopCenter =
            (gridContent.scrollHeight * (zoomLevel / 100 - 1)) / 2;

          // Scroll pozisyonunu içeriğin merkezine ayarla
          gridContainer.scrollLeft = scrollLeftCenter;
          gridContainer.scrollTop = scrollTopCenter;
        }
      }
    }
  }, [zoomLevel]);

  // Hücre boyutlarını varsayılan değerlere sıfırla
  const resetCellDimensions = () => {
    setCellWidth(160);
    setCellHeight(56);
  };

  // Tarih değişiklikleri için işlevler
  const goToNextDay = () => {
    const nextDay = addDays(selectedDate, 1);
    setSelectedDate(nextDay);
    // Tarih değişikliğinde rezervasyonları filtrele
    filterReservationsByDate(nextDay);
    console.log(`Tarih değişti: ${format(nextDay, "yyyy-MM-dd")}`);
  };

  const goToPreviousDay = () => {
    const prevDay = subDays(selectedDate, 1);
    setSelectedDate(prevDay);
    // Tarih değişikliğinde rezervasyonları filtrele
    filterReservationsByDate(prevDay);
    console.log(`Tarih değişti: ${format(prevDay, "yyyy-MM-dd")}`);
  };

  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    // Tarih değişikliğinde rezervasyonları filtrele
    filterReservationsByDate(today);
  };

  const handleDaySelect = (day: Date | undefined) => {
    if (day) {
      setSelectedDate(day);
      setIsCalendarOpen(false);
      // Tarih değişikliğinde rezervasyonları filtrele
      filterReservationsByDate(day);
      console.log(`Seçilen tarih değişti: ${format(day, "yyyy-MM-dd")}`);

      // Tarih değişikliğinde aktif form varsa temizle
      setActiveForms([]);
    }
  };

  // Tarihe göre rezervasyonları filtrele
  const filterReservationsByDate = async (date: Date) => {
    // Seçilen tarihi güncelle
    setSelectedDate(date);

    // Formatlanmış tarih
    const formattedDate = format(date, "yyyy-MM-dd");

    try {
      // Firebase üzerinden rezervasyonları getir
      setIsLoading(true); // Yükleme durumunu göster

      // Başlangıç ve bitiş tarihlerini Date nesnesi olarak oluştur
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      console.log(
        `FİLTRELEME İŞLEMİ: ${formattedDate} tarihli rezervasyonlar aranıyor...`
      );

      // Firebase'den rezervasyonları al
      const reservationsRef = collection(db, "reservations");
      const reservationsQuery = query(
        reservationsRef,
        where("start_time", ">=", Timestamp.fromDate(startOfDay)),
        where("start_time", "<=", Timestamp.fromDate(endOfDay))
      );

      const reservationsSnapshot = await getDocs(reservationsQuery);

      console.log(
        `Veritabanından ${reservationsSnapshot.size} rezervasyon alındı`
      );

      // Firebase'den gelen rezervasyonları lokal formata dönüştür
      const formattedReservations = reservationsSnapshot.docs.map((doc) => {
        const dbRes = doc.data();
        const startTime = dbRes.start_time?.toDate() || new Date();
        const endTime = dbRes.end_time?.toDate() || new Date();

        return {
          id: doc.id,
          tableId: dbRes.table_id || "",
          customerName: dbRes.customer_name || "",
          guestCount: dbRes.guest_count || 1,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          status:
            dbRes.status === "completed"
              ? "confirmed"
              : (dbRes.status as "confirmed" | "pending" | "cancelled"),
          note: dbRes.note || "",
          color: dbRes.color || "",
          staffIds: dbRes.staff_ids || [], // Firebase'den gelen personel listesi
        };
      });

      // Hata ayıklama için alınan rezervasyonları göster
      console.log(
        "Veritabanından alınan rezervasyonlar:",
        formattedReservations.map((r: ReservationType) => ({
          id: r.id,
          tarih: r.startTime,
          masa: r.tableId,
        }))
      );

      // Yükleme durumunu kapat
      setIsLoading(false);

      // Aktif formları temizle - tarih değiştiğinde devam eden formlar silinmeli
      setActiveForms([]);

      // Filtrelenmiş rezervasyonları güncelle
      setReservations(formattedReservations);

      // Gün değiştiğinde masa seçimlerini temizle
      clearTableSelection();

      // Gün değiştiğinde garson atamalarını da temizle
      clearTableStaffAssignments();

      // Sağ paneli kapat
      closeRightSidebar();

      // Bugün değilse kırmızı çizgiyi gizlemek için mevcut zaman pozisyonunu sıfırla
      const today = new Date();
      const selectedDateStr = format(date, "yyyy-MM-dd");
      const todayStr = format(today, "yyyy-MM-dd");

      // Her koşulda güncel zaman pozisyonunu hesapla, JSX içinde bugüne göre koşullu gösterilecek
      const currentDate = new Date();
      const formattedTime = format(currentDate, "HH:mm");
      setCurrentTime(formattedTime);

      // Geçerli saati bul (7'den başlayarak)
      const hourPart = parseInt(formattedTime.split(":")[0]);
      const minutePart = parseInt(formattedTime.split(":")[1]);

      let hourIndex = -1;
      if (hourPart >= 7 && hourPart <= 24) {
        hourIndex = hourPart - 7;
      } else if (hourPart >= 1 && hourPart <= 2) {
        hourIndex = 24 - 7 + hourPart; // 01:00 ve 02:00 için
      }

      if (hourIndex >= 0) {
        // Saat ve dakikaya göre pozisyonu hesapla
        const position = hourIndex * cellWidth + (minutePart / 60) * cellWidth;
        setCurrentTimePosition(position);
      }

      // Eğer rezervasyon yoksa toast bildirimi göstermiyoruz
      // Toast kaldırıldı çünkü başka bir yerden zaten bildirim gösteriliyor
    } catch (error) {
      console.error("Rezervasyonları filtreleme hatası:", error);
      toast.error("Rezervasyon verileri yüklenirken bir hata oluştu.");
    }
  };

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<
    "left" | "right" | null
  >(null);
  const [draggedReservation, setDraggedReservation] =
    useState<ReservationType | null>(null);
  const [initialDragPosition, setInitialDragPosition] = useState({
    x: 0,
    y: 0,
  });
  const [initialStartTime, setInitialStartTime] = useState("");
  const [initialEndTime, setInitialEndTime] = useState("");
  const [initialTableId, setInitialTableId] = useState("");

  // Sürüklemeye başladığında
  const handleDragStart = (
    reservation: ReservationType,
    e: React.MouseEvent
  ) => {
    setIsDragging(true);
    setDraggedReservation(reservation);

    // Başlangıç değerlerini kaydet
    setInitialStartTime(reservation.startTime);
    setInitialEndTime(reservation.endTime);
    setInitialTableId(reservation.tableId);
  };

  // Sürükleme sırasında
  const handleDrag = (e: any, data: { x: number; y: number }) => {
    if (!draggedReservation) return;

    // Taşıma esnasında kırmızı çizgi kontrolü
    const isToday =
      format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

    // Mevcut fare konumunu al
    const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
    const clientY = e.clientY || e.touches?.[0]?.clientY || 0;

    // Fare konum bilgisi yoksa işlemi durdur
    if (clientX === 0 && clientY === 0) return;

    // Masa ID'sini bulmak için elementsFromPoint kullan
    const elementsAtPoint = document.elementsFromPoint(clientX, clientY);
    let foundTableId = null;

    // Özel data-* attributelerini içeren elementleri bul
    for (const element of elementsAtPoint) {
      // Eğer data-table-id attribute'u varsa
      const tableId = element.getAttribute("data-table-id");
      if (tableId) {
        foundTableId = tableId;
        break;
      }

      // Eğer parent elementlerde data-table-id attribute'u varsa
      let parent = element.parentElement;
      while (parent) {
        const parentTableId = parent.getAttribute("data-table-id");
        if (parentTableId) {
          foundTableId = parentTableId;
          break;
        }
        parent = parent.parentElement;
      }

      if (foundTableId) break;
    }

    // Eğer yine de bulunamadıysa, taşıma sırasında rect kontrolü yap
    if (!foundTableId) {
      const tableElements = document.querySelectorAll("[data-table-id]");
      for (const tableElement of tableElements as NodeListOf<HTMLElement>) {
        const rect = tableElement.getBoundingClientRect();
        if (
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom
        ) {
          foundTableId = tableElement.getAttribute("data-table-id");
          break;
        }
      }
    }

    // Masa ID'si bulunduysa rezervasyonu güncelle
    if (foundTableId) {
      draggedReservation.tableId = foundTableId;
    }

    // x pozisyonuna göre zaman değişimi
    const initialPosition = getReservationPosition(
      initialStartTime,
      initialEndTime
    );
    const initialLeft = parseInt(initialPosition.left);
    const offsetX = data.x;

    // Zaman hesaplama - 15 dakikalık periyotlara göre
    const cellWidthMinutes = 60;
    const minuteStep = 15; // 15 dakikalık periyotlar
    const minuteOffset =
      Math.round(((offsetX / cellWidth) * cellWidthMinutes) / minuteStep) *
      minuteStep;

    // Başlangıç ve bitiş zamanlarını güncelle
    const startMinutes = convertTimeToMinutes(initialStartTime);
    const endMinutes = convertTimeToMinutes(initialEndTime);
    const duration = endMinutes - startMinutes;

    // Yeni zamanları hesapla (15 dakikalık periyotlara yuvarlanmış)
    let newStartMinutes = startMinutes + minuteOffset;
    let newEndMinutes = newStartMinutes + duration;

    // Bugün için özel durumlar
    if (isToday && currentTimePosition !== null) {
      // Şu anki zaman (dakika olarak)
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTotalMinutes = currentHour * 60 + currentMinute;

      // Eğer yeni başlangıç zamanı mevcut zamanın gerisindeyse, şu anki zamana ayarla
      if (newStartMinutes < currentTotalMinutes) {
        // Şu anki zamanı 15 dakikalık periyoda yuvarla (yukarı)
        const roundedCurrentMinutes =
          Math.ceil(currentTotalMinutes / minuteStep) * minuteStep;
        const offsetChange = roundedCurrentMinutes - newStartMinutes;
        newStartMinutes = roundedCurrentMinutes;
        newEndMinutes += offsetChange;
      }
    }

    // 15 dakikalık periyotlara göre yuvarla
    newStartMinutes = Math.round(newStartMinutes / minuteStep) * minuteStep;
    newEndMinutes = Math.round(newEndMinutes / minuteStep) * minuteStep;

    // Zamanları güncelle
    draggedReservation.startTime = convertMinutesToTime(newStartMinutes);
    draggedReservation.endTime = convertMinutesToTime(newEndMinutes);

    // Pozisyonu güncelle
    setDraggedReservation({ ...draggedReservation });
  };

  // Sürükleme tamamlandığında çağrılacak fonksiyon
  const handleDragStop = (e: any, ui: { x: number; y: number }) => {
    if (!draggedReservation) {
      setIsDragging(false);
      return;
    }

    // Bugün değilse kırmızı çizgi kontrolü yapmaya gerek yok
    const isToday =
      format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

    // Şu anki zaman (mevcut dakika olarak hesaplanıyor)
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    // Başlangıç zamanı dakika olarak
    const startMinutes = convertTimeToMinutes(draggedReservation.startTime);

    // Eğer bugün ise ve başlangıç zamanı şu anki zamandan önceyse (geçmiş bir saat), orijinal değerlere geri dön
    if (isToday && startMinutes < currentTotalMinutes) {
      toast.error(
        "Geçmiş saat için rezervasyon düzenlenemez. Orijinal konuma geri dönülüyor."
      );

      // Orijinal değerlere geri dön
      draggedReservation.tableId = initialTableId;
      draggedReservation.startTime = initialStartTime;
      draggedReservation.endTime = initialEndTime;

      setDraggedReservation({ ...draggedReservation });
      setIsDragging(false);
      setDraggedReservation(null);
      return;
    }

    // Masa değişimi oldu mu kontrol et
    const hasMasaChanged = initialTableId !== draggedReservation.tableId;

    // Varsa çakışmaları kontrol et
    const hasConflict = hasTableConflict(
      draggedReservation.tableId,
      draggedReservation.startTime,
      draggedReservation.endTime,
      draggedReservation.id
    );

    if (hasConflict) {
      // Çakışma varsa, orijinal pozisyona geri dön
      toast.error(
        "Bu masa ve zaman aralığında başka bir rezervasyon bulunuyor!"
      );

      // Orijinal değerlere geri dön
      draggedReservation.tableId = initialTableId;
      draggedReservation.startTime = initialStartTime;
      draggedReservation.endTime = initialEndTime;

      setDraggedReservation({ ...draggedReservation });
    } else if (hasMasaChanged) {
      // Çakışma yoksa ve masa değişimi varsa kullanıcıya sor
      const oldTable = tables.find((t) => t.id === initialTableId);
      const newTable = tables.find((t) => t.id === draggedReservation.tableId);

      if (oldTable && newTable) {
        const userConfirm = window.confirm(
          `Rezervasyonu Masa ${oldTable.number}'den Masa ${newTable.number}'e taşımak istediğinize emin misiniz?`
        );

        if (userConfirm) {
          // Onay verilince güncellemeyi yap
          updateReservation(draggedReservation);
          toast.success(
            `Rezervasyon Masa ${newTable.number}'e başarıyla taşındı!`
          );

          // Sidebar'ı güncelle
          if (selectedReservation?.id === draggedReservation.id) {
            setSelectedReservation(draggedReservation);
          }
        } else {
          // Onay verilmezse orijinal değerlere geri dön
          draggedReservation.tableId = initialTableId;
          draggedReservation.startTime = initialStartTime;
          draggedReservation.endTime = initialEndTime;

          setDraggedReservation({ ...draggedReservation });
        }
      } else {
        // Masa bulunamadıysa güncellemeyi gerçekleştir
        updateReservation(draggedReservation);
        toast.success("Rezervasyon başarıyla taşındı!");

        if (selectedReservation?.id === draggedReservation.id) {
          setSelectedReservation(draggedReservation);
        }
      }
    } else {
      // Çakışma yoksa ve masa değişimi yoksa, sadece zaman değişimi
      updateReservation(draggedReservation);
      toast.success("Rezervasyon başarıyla taşındı!");

      // Sidebar'ı güncelle
      if (selectedReservation?.id === draggedReservation.id) {
        setSelectedReservation(draggedReservation);
      }
    }

    setIsDragging(false);
    setDraggedReservation(null);
  };

  // Genişletmeye başladığında
  const handleResizeStart = (
    e: React.MouseEvent,
    direction: "left" | "right",
    reservation: ReservationType
  ) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    setDraggedReservation(reservation);

    // Başlangıç değerlerini kaydet
    setInitialStartTime(reservation.startTime);
    setInitialEndTime(reservation.endTime);

    // Başlangıç pozisyonunu kaydet
    const position = getReservationPosition(
      reservation.startTime,
      reservation.endTime
    );
    const leftPx = parseInt(position.left);
    setInitialDragPosition({ x: leftPx, y: 0 });

    // Tüm diğer rezervasyonları gölgele
    document.querySelectorAll("[data-reservation-id]").forEach((el) => {
      if (el.getAttribute("data-reservation-id") !== reservation.id) {
        (el as HTMLElement).style.opacity = "0.5";
      }
    });
  };

  // Genişletme esnasında
  const handleResize = (
    e: React.SyntheticEvent,
    data: ResizeCallbackData,
    reservation: ReservationType,
    direction: "left" | "right"
  ) => {
    if (!draggedReservation) return;

    // Bugün değilse kırmızı çizgi kontrolü yapmaya gerek yok
    const isToday =
      format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

    const { size } = data;
    const cellWidthMinutes = 60;
    // 15 dakikalık adım boyutu (kesin 15 dakikalık aralıklarla çalışması için)
    const minuteStep = 15;
    const pxPerStep = (cellWidth / cellWidthMinutes) * minuteStep;

    // Sağdan veya soldan boyutlandırma durumunu hesapla
    if (direction === "right") {
      // Sağdan boyutlandırma - sadece genişlik değişir, sol pozisyon sabit kalır
      const currentWidth = parseInt(
        getReservationPosition(
          draggedReservation.startTime,
          draggedReservation.endTime
        ).width
      );
      const widthDiff = size.width - currentWidth;

      // Farkı 15 dakikalık adımlara yuvarla
      const stepsCount = Math.round(widthDiff / pxPerStep);
      const minutesDiff = stepsCount * minuteStep;

      // Bitiş zamanını güncelle
      const endMinutes = convertTimeToMinutes(draggedReservation.endTime);
      const newEndMinutes = endMinutes + minutesDiff;
      const startMinutes = convertTimeToMinutes(draggedReservation.startTime);

      // Minimum süre kontrolü (15 dakika)
      if (newEndMinutes - startMinutes >= 15) {
        // Yeni bitiş zamanını 15 dakikalık adımlara yuvarla
        const roundedEndMinutes =
          Math.round(newEndMinutes / minuteStep) * minuteStep;
        draggedReservation.endTime = convertMinutesToTime(roundedEndMinutes);
      }
    } else if (direction === "left") {
      // Soldan boyutlandırma - sol pozisyon ve genişlik değişir
      const currentPosition = getReservationPosition(
        initialStartTime,
        initialEndTime
      );
      const currentLeft = parseInt(currentPosition.left);
      const positionDiff =
        parseInt(
          getReservationPosition(
            draggedReservation.startTime,
            draggedReservation.endTime
          ).left
        ) - currentLeft;

      // Farkı 15 dakikalık adımlara yuvarla
      const stepsCount = Math.round(positionDiff / pxPerStep);
      const minutesDiff = stepsCount * minuteStep;

      // Başlangıç zamanını güncelle
      const startMinutes = convertTimeToMinutes(initialStartTime);
      let newStartMinutes = startMinutes + minutesDiff;
      const endMinutes = convertTimeToMinutes(draggedReservation.endTime);

      // Eğer bugün ise ve kırmızı çizgiyi geçmeye çalışıyorsa kontrol et
      if (isToday && currentTimePosition !== null) {
        // Şu anki zaman (mevcut dakika olarak)
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTotalMinutes = currentHour * 60 + currentMinute;

        // Eğer yeni başlangıç zamanı mevcut zamanın gerisindeyse
        if (newStartMinutes < currentTotalMinutes) {
          // Şu anki zaman dakikasını 15 dakikalık periyoda yuvarla
          const roundedCurrentMinutes =
            Math.ceil(currentTotalMinutes / minuteStep) * minuteStep;
          newStartMinutes = roundedCurrentMinutes;

          // Kullanıcıya bilgi ver
          toast.success(
            "Geçmiş saatlere rezervasyon genişletilemez. Başlangıç şu anki saate ayarlandı.",
            {
              id: "past-time-resize",
              duration: 1500,
            }
          );
        }
      }

      // Başlangıç zamanını 15 dakikalık adımlara yuvarla
      newStartMinutes = Math.round(newStartMinutes / minuteStep) * minuteStep;

      // Minimum süre kontrolü (15 dakika)
      if (endMinutes - newStartMinutes >= 15) {
        draggedReservation.startTime = convertMinutesToTime(newStartMinutes);
      }
    }

    // Pozisyonu güncelle
    setDraggedReservation({ ...draggedReservation });
  };

  // Genişletme tamamlandığında
  const handleResizeStop = (
    e: React.SyntheticEvent,
    data: ResizeCallbackData,
    reservation: ReservationType
  ) => {
    if (!draggedReservation) {
      setIsResizing(false);
      setResizeDirection(null);
      return;
    }

    // Bugün değilse kırmızı çizgi kontrolü yapmaya gerek yok
    const isToday =
      format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

    // Şu anki zaman (mevcut dakika olarak hesaplanıyor)
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    // Başlangıç zamanı dakika olarak
    const startMinutes = convertTimeToMinutes(draggedReservation.startTime);

    // Eğer bugün ise ve başlangıç zamanı şu anki zamandan önceyse (geçmiş bir saat), orijinal değerlere geri dön
    if (isToday && startMinutes < currentTotalMinutes) {
      toast.error(
        "Geçmiş saat için rezervasyon düzenlenemez. Orijinal konuma geri dönülüyor."
      );

      // Orijinal değerlere geri dön
      draggedReservation.startTime = initialStartTime;
      draggedReservation.endTime = initialEndTime;

      setDraggedReservation({ ...draggedReservation });
      setIsResizing(false);
      setResizeDirection(null);
      setDraggedReservation(null);
      return;
    }

    // Varsa çakışmaları kontrol et
    const hasConflict = hasTableConflict(
      draggedReservation.tableId,
      draggedReservation.startTime,
      draggedReservation.endTime,
      draggedReservation.id
    );

    if (hasConflict) {
      // Çakışma varsa, orijinal pozisyona geri dön
      toast.error("Bu zaman aralığında çakışma bulunuyor!");

      // Orijinal değerlere geri dön
      draggedReservation.startTime = initialStartTime;
      draggedReservation.endTime = initialEndTime;

      setDraggedReservation({ ...draggedReservation });
    } else {
      // Çakışma yoksa, güncellenmiş rezervasyonu kaydet
      updateReservation(draggedReservation);
      toast.success("Rezervasyon süresi güncellendi!");

      // Sidebar'ı güncelle
      if (selectedReservation?.id === draggedReservation.id) {
        setSelectedReservation(draggedReservation);
      }
    }

    setIsResizing(false);
    setResizeDirection(null);
    setDraggedReservation(null);
  };

  // Masa taşıma ve elementler arasındaki etkileşimi geliştirmek için
  useEffect(() => {
    // Sayfadaki tüm masa hücrelerinin doğru şekilde işaretlendiğinden emin olalım
    const markAllTableCells = () => {
      // Her masa hücresine data-table-id özniteliğini ekleyelim
      document.querySelectorAll(".table-row").forEach((tableRow) => {
        if (!tableRow.hasAttribute("data-table-id")) {
          // Eğer yoksa, bu hücre için bir üst elementten almaya çalışalım
          const parentWithTableId = tableRow.closest("[data-table-id]");
          if (parentWithTableId) {
            const tableId = parentWithTableId.getAttribute("data-table-id");
            if (tableId) {
              tableRow.setAttribute("data-table-id", tableId);
              console.log("Hücreye data-table-id eklendi:", tableId);
            }
          }
        }
      });
    };

    // Sayfa yüklendikten sonra çalıştır
    setTimeout(markAllTableCells, 1000);

    // Sayfa değişikliklerinde de çalıştır
    window.addEventListener("resize", markAllTableCells);

    return () => {
      window.removeEventListener("resize", markAllTableCells);
    };
  }, [tables]);

  // Şu anki zamanı kullanarak, zaman çizgisinin solunda kalan (geçmiş) rezervasyonları kontrol eden fonksiyon
  // Fonksiyon overloads - hem string hem de ReservationType parametreleri için
  function isReservationPast(startTime: string): boolean;
  function isReservationPast(reservation: ReservationType): boolean;
  function isReservationPast(param: string | ReservationType): boolean {
    try {
      // Bugünden farklı bir gün seçilmişse farklı davranış göster
      const today = new Date();
      const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
      const todayStr = format(today, "yyyy-MM-dd");

      // Seçilen tarih bugünden önceyse tüm rezervasyonlar geçmiş olarak kabul edilir
      if (selectedDateStr < todayStr) {
        return true;
      }

      // Seçilen tarih bugünden sonraysa hiçbir rezervasyon geçmiş olarak kabul edilmez
      if (selectedDateStr > todayStr) {
        return false;
      }

      // Aynı gündeyiz, kontrole devam et

      // Başlangıç ve bitiş zamanını al (string veya ReservationType olabilir)
      let startTimeStr: string;
      let endTimeStr: string;

      if (typeof param === "string") {
        // Eğer parametre bir string ise, bu başlangıç zamanıdır
        startTimeStr = param;

        // Varsayılan olarak 1 saat sonrasını bitiş saati olarak kabul et
        const startHour = parseInt(startTimeStr.split(":")[0]);
        const startMinute = parseInt(startTimeStr.split(":")[1] || "0");
        let endHour = startHour + 1;
        if (endHour >= 24) endHour -= 24;
        endTimeStr = `${endHour.toString().padStart(2, "0")}:${startMinute
          .toString()
          .padStart(2, "0")}`;
      } else {
        // Eğer parametre bir ReservationType nesnesi ise, hem başlangıç hem bitiş zamanını kullan
        startTimeStr = param.startTime;
        endTimeStr = param.endTime;
      }

      // Tarih bilgisini çıkar, sadece saat kısmını al
      const extractTimeOnly = (timeStr: string): string => {
        if (timeStr.includes(" ")) {
          return timeStr.split(" ")[1]; // "yyyy-MM-dd HH:mm" -> "HH:mm"
        } else if (timeStr.includes("T")) {
          return timeStr.split("T")[1].substring(0, 5); // "yyyy-MM-ddTHH:mm:ss" -> "HH:mm"
        }
        return timeStr; // Zaten saat formatındaysa olduğu gibi bırak
      };

      const timeOnlyStart = extractTimeOnly(startTimeStr);
      const timeOnlyEnd = extractTimeOnly(endTimeStr);

      // Şu anki saat ve dakikayı al
      const currentHour = today.getHours();
      const currentMinute = today.getMinutes();

      // Saatleri dakikaya çevir
      const convertToMinutes = (time: string): number => {
        const [hours, minutes] = time.split(":").map(Number);
        return hours * 60 + minutes;
      };

      // Rezervasyon zamanlarını dakika cinsinden hesapla
      const startMinutes = convertToMinutes(timeOnlyStart);
      const endMinutes = convertToMinutes(timeOnlyEnd);
      const currentMinutes = currentHour * 60 + currentMinute;

      // Gece yarısı düzeltmeleri
      let adjustedStartMinutes = startMinutes;
      let adjustedEndMinutes = endMinutes;
      let adjustedCurrentMinutes = currentMinutes;

      // Gece yarısı sonrası saat kontrolü (00:00-06:59)
      if (startMinutes < 7 * 60) adjustedStartMinutes += 24 * 60;
      if (endMinutes < 7 * 60) adjustedEndMinutes += 24 * 60;
      if (currentMinutes < 7 * 60) adjustedCurrentMinutes += 24 * 60;

      // Eğer bitiş saati başlangıç saatinden küçükse (gece yarısını geçen durumlar)
      if (endMinutes < startMinutes) {
        adjustedEndMinutes += 24 * 60;
      }

      // Debug bilgisi
      console.log("Rezervasyon geçmiş kontrolü:", {
        start: timeOnlyStart,
        end: timeOnlyEnd,
        current: `${currentHour}:${currentMinute}`,
        startMin: startMinutes,
        endMin: endMinutes,
        currentMin: currentMinutes,
        adjustedStartMin: adjustedStartMinutes,
        adjustedEndMin: adjustedEndMinutes,
        adjustedCurrentMin: adjustedCurrentMinutes,
      });

      // Rezervasyon tamamen geçmişte kalmış mı kontrol et
      // Yani şu anki zaman, rezervasyonun bitiş zamanından sonra mı?
      return adjustedCurrentMinutes >= adjustedEndMinutes;
    } catch (error) {
      console.error("isReservationPast hata:", error);
      return false; // Hata olduğunda false döndür
    }
  }

  // Rezervasyon durumlarını saklamak için state
  const [reservationStatuses, setReservationStatuses] = useState<
    Record<string, "arrived" | "departed" | null>
  >({});

  // Rezervasyon kartı rengini belirle
  const getReservationColor = (reservation: ReservationType): string => {
    try {
      // Geçmiş rezervasyonlar için siyah renk kullan (ÖNCE KONTROL ET)
      if (isReservationPast(reservation)) {
        return "#111827"; // gray-900
      }

      // Rezervasyon durumlarına göre özel renklendirme
      if (reservationStatuses[reservation.id] === "arrived") {
        return "#ec4899"; // pink-500
      } else if (reservationStatuses[reservation.id] === "departed") {
        return "#111827"; // gray-900
      }

      // Rezervasyon rengini kullan (eğer varsa)
      if (reservation.color) {
        return reservation.color;
      }

      // Varsayılan kategori renkleri
      const category = tableCategories.find(
        (cat) =>
          tables.find((table) => table.id === reservation.tableId)
            ?.categoryId === cat.id
      );

      return category ? category.color : "#4B5563"; // Varsayılan gri renk
    } catch (error) {
      console.error("getReservationColor hata:", error);
      return "#4B5563"; // Hata durumunda varsayılan renk
    }
  };

  // Rezervasyon durumunu değiştiren fonksiyon
  const handleReservationStatusChange = (
    reservationId: string,
    status: "arrived" | "departed" | null
  ) => {
    setReservationStatuses((prev) => ({
      ...prev,
      [reservationId]: status,
    }));

    // Değişiklikleri localStorage'a kaydet
    const updatedStatuses = {
      ...reservationStatuses,
      [reservationId]: status,
    };
    localStorage.setItem(
      "reservationStatuses",
      JSON.stringify(updatedStatuses)
    );
  };

  // Rezervasyon durumlarını localStorage'dan yükle
  useEffect(() => {
    const savedStatuses = localStorage.getItem("reservationStatuses");
    if (savedStatuses) {
      try {
        setReservationStatuses(JSON.parse(savedStatuses));
      } catch (error) {
        console.error("Rezervasyon durumları yüklenirken hata oluştu:", error);
      }
    }

    // Geliştirme için rezervasyon verilerini konsola yazdır
    const reservationData = localStorage.getItem("reservations");
    if (reservationData) {
      try {
        const parsedData = JSON.parse(reservationData);
        console.log("MEVCUT REZERVASYONLAR:", parsedData);
      } catch (e) {
        console.error("Rezervasyon veri hatası:", e);
      }
    }
  }, []);

  // Belirli bir saat ve zamanın geçmiş (kırmızı çizginin solunda) olup olmadığını kontrol et
  const isTimePast = (hour: string): boolean => {
    try {
      // Bugünden farklı bir gün seçilmişse farklı davranış göster
      const today = new Date();
      const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
      const todayStr = format(today, "yyyy-MM-dd");

      // Seçilen tarih bugünden önceyse tüm saatler geçmiş olarak kabul edilir
      if (selectedDateStr < todayStr) {
        return true;
      }

      // Seçilen tarih bugünden sonraysa hiçbir saat geçmiş olarak kabul edilmez
      if (selectedDateStr > todayStr) {
        return false;
      }

      // Aynı gündeyiz, normal kontrollere devam et
      // Şu anki saat ve dakikayı al
      const currentHour = today.getHours();
      const currentMinute = today.getMinutes();

      // Kontrol edilecek saati ve dakikayı al
      // Önce formatı kontrol et (T içeriyor mu diye)
      let hourStr, minuteStr;

      if (hour.includes("T")) {
        // ISO string formatı (yyyy-MM-ddTHH:mm) ise
        const timePart = hour.split("T")[1];
        [hourStr, minuteStr] = timePart.substring(0, 5).split(":");
      } else {
        // Normal saat formatı (HH:mm) ise
        [hourStr, minuteStr] = hour.split(":");
      }

      const checkHour = parseInt(hourStr);
      const checkMinute = parseInt(minuteStr) || 0; // Eğer dakika yoksa 0 olarak al

      // Şu anki zamanı dakika olarak hesapla (saat * 60 + dakika)
      const currentTimeInMinutes = currentHour * 60 + currentMinute;

      // Kontrol edilecek zamanı dakika olarak hesapla
      const checkTimeInMinutes = checkHour * 60 + checkMinute;

      // Gece yarısı çevresindeki saatler için düzeltme
      let adjustedCurrentTime = currentTimeInMinutes;
      let adjustedCheckTime = checkTimeInMinutes;

      // Gece yarısından sonraki saatler için (00:00-06:59)
      if (checkHour >= 0 && checkHour < 7) {
        adjustedCheckTime += 24 * 60; // 24 saat ekle
      }

      if (currentHour >= 0 && currentHour < 7) {
        adjustedCurrentTime += 24 * 60; // 24 saat ekle
      }

      // Şu anki zaman, kontrol edilecek zamandan büyükse, bu saat geçmiştir
      return adjustedCurrentTime > adjustedCheckTime;
    } catch (error) {
      console.error("isTimePast hata:", error);
      return false; // Hata olduğunda false döndür
    }
  };

  // Ayrı bir state ile bileşenin güncellenmesini zorla
  const [forceUpdate, setForceUpdate] = useState(0);

  useEffect(() => {
    // Başlangıçta saati ayarla
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    setCurrentTime(`${hours}:${minutes}:00`);

    // Her saniye saati güncelle
    const interval = setInterval(() => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}:00`);

      // Her dakika değiştiğinde sayfayı yenile (her 59 saniyede bir yenileme için gerekli)
      const seconds = now.getSeconds();
      if (seconds === 59) {
        // Timeline'da yansıtmak için forceUpdate yapılabilir
        setForceUpdate((prev) => prev + 1);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Masa başına atanmış garsonları tutan state
  const [tableStaffAssignments, setTableStaffAssignments] = useState<
    Record<string, string[]>
  >({});

  // Şu anda seçili olan masaları tutan state
  const [selectedTables, setSelectedTables] = useState<string[]>([]);

  // Garson atama modalının açık olup olmadığını belirten state
  const [isStaffAssignmentModalOpen, setIsStaffAssignmentModalOpen] =
    useState(false);

  // Seçilen personel state'i (şu anda atanacak olan garsonlar)
  const [currentSelectedStaff, setCurrentSelectedStaff] = useState<string[]>(
    []
  );

  // Masalara garson ataması yap
  const assignStaffToTables = (staffIds: string[]) => {
    console.log("Atanan garsonlar:", staffIds);

    const updatedAssignments = { ...tableStaffAssignments };

    // Seçilen her masa için atama yap
    selectedTables.forEach((tableId) => {
      updatedAssignments[tableId] = [...staffIds]; // Kopyasını oluştur
    });

    // State'i güncelle
    setTableStaffAssignments(updatedAssignments);

    // Yerel depolamaya kaydet
    localStorage.setItem(
      "tableStaffAssignments",
      JSON.stringify(updatedAssignments)
    );

    // Modal'ı kapat
    closeStaffAssignmentModal();

    // Başarı mesajı göster
    toast.success(
      `${selectedTables.length} masa için ${staffIds.length} garson atandı!`
    );

    // Masa seçimini temizle
    clearTableSelection();
  };

  // Modal açma fonksiyonu
  const openStaffAssignmentModal = () => {
    // Eğer sadece bir masa seçiliyse, o masaya atanmış garsonları başlangıç ​​değeri olarak ayarla
    if (selectedTables.length === 1) {
      const tableId = selectedTables[0];
      const assignedStaff = tableStaffAssignments[tableId] || [];
      console.log("Mevcut atanmış garsonlar:", assignedStaff);
      setCurrentSelectedStaff(assignedStaff);
    } else {
      // Birden fazla masa seçiliyse, boş array ile başla
      setCurrentSelectedStaff([]);
    }

    // Modalı aç
    setIsStaffAssignmentModalOpen(true);
  };

  // Modal kapatma fonksiyonu
  const closeStaffAssignmentModal = () => {
    setIsStaffAssignmentModalOpen(false);
  };

  // Masanın seçili olup olmadığını kontrol et
  const isTableSelected = (tableId: string) => {
    return selectedTables.includes(tableId);
  };

  // Masayı seç veya seçimi kaldır
  const toggleTableSelection = (tableId: string) => {
    if (isTableSelected(tableId)) {
      setSelectedTables(selectedTables.filter((id) => id !== tableId));
    } else {
      setSelectedTables([...selectedTables, tableId]);
    }
  };

  // Masa seçimini temizle
  const clearTableSelection = () => {
    setSelectedTables([]);
  };

  // Masa garson atamalarını temizle
  const clearTableStaffAssignments = () => {
    setTableStaffAssignments({});
    localStorage.removeItem("tableStaffAssignments");
  };

  // Masa ID'si ile masa numarası ve kategorisini al
  const getTableInfo = (tableId: string) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return { number: "?", category: "?" };

    const category = tableCategories.find((c) => c.id === table.categoryId);
    return {
      number: table.number,
      category: category?.name || "?",
    };
  };

  // Masaya atanmış garsonların isimlerini döndür
  const getAssignedStaffNames = (tableId: string) => {
    const staffIds = tableStaffAssignments[tableId] || [];
    return staffIds.map((id) => {
      const staffMember = staff.find((s) => s.id === id);
      return staffMember ? staffMember.name : "?";
    });
  };

  // Yerel depolamadan masa-garson atamalarını yükle
  useEffect(() => {
    try {
      const savedAssignments = localStorage.getItem("tableStaffAssignments");
      if (savedAssignments) {
        setTableStaffAssignments(JSON.parse(savedAssignments));
      }
    } catch (error) {
      console.error("Masa-garson atamaları yüklenirken hata:", error);
    }
  }, []);

  // Mevcut saati dakika olarak (HH:MM formatında) döndüren fonksiyon
  const getCurrentTimeString = (): string => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  // Belirli bir hücrenin kırmızı çizgi ile kesişip kesişmediğini ve nerede kesiştiğini belirleyen fonksiyon
  const getCellRedLineIntersection = (
    hour: string
  ): { intersects: boolean; position: number | null } => {
    // Sadece bugün için geçerli
    if (
      format(selectedDate, "yyyy-MM-dd") !== format(new Date(), "yyyy-MM-dd")
    ) {
      return { intersects: false, position: null };
    }

    // Hücrenin başlangıç saati
    const cellHour = parseInt(hour.split(":")[0]);

    // Mevcut saat
    const currentTimeArr = currentTime.split(":");
    const currentHour = parseInt(currentTimeArr[0]);
    const currentMinute = parseInt(currentTimeArr[1]);

    // Aynı saatte miyiz?
    if (cellHour === currentHour) {
      // Kırmızı çizgi bu hücrede, dakika kısmına göre pozisyonu hesapla (0-1 arası değer)
      const position = currentMinute / 60;
      return { intersects: true, position };
    }

    return { intersects: false, position: null };
  };

  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  // Sayfa yüklendiğinde veya tarayıcı yeniden boyutlandığında tablo ve rezervasyonları yükle
  useEffect(() => {
    // Tarayıcı tarafında çalışıyor muyuz kontrol et
    if (typeof window !== "undefined") {
      // Sayfa yüklendiğinde bugünün verilerini getir
      const today = new Date();
      filterReservationsByDate(today);

      // Tabloları yükle
      loadTables();

      // Event listener'ları ekle - burada handleResize fonksiyonu
      // daha önceden tanımlanmış olduğundan onu kullanıyoruz
      const handleWindowResize = () => {
        // Direkt olarak gerekli işlemler yapılabilir
        if (gridContainerRef.current) {
          // İçeriğin boyutları ve görünüm alanına göre gerekli düzenlemeler
          const gridContainer = gridContainerRef.current;
          const gridContent = gridContainer.querySelector("div");

          if (gridContent) {
            // Görünüm alanı boyutları
            const viewportWidth = gridContainer.clientWidth;

            // Güncel saat pozisyonunu hesapla
            const now = new Date();
            const formattedTime = format(now, "HH:mm");

            // Zamanın hangi hücrede olduğunu bul
            const hourPart = parseInt(formattedTime.split(":")[0]);
            const minutePart = parseInt(formattedTime.split(":")[1]);

            // Saat indeksi hesapla
            let hourIndex = -1;
            if (hourPart >= 7 && hourPart <= 23) {
              hourIndex = hourPart - 7;
            } else if (hourPart >= 0 && hourPart <= 2) {
              hourIndex = 24 - 7 + hourPart; // Gece yarısı sonrası için
            }

            if (hourIndex >= 0) {
              // Saat pozisyonunu hesapla
              const position =
                hourIndex * cellWidth + (minutePart / 60) * cellWidth;
              // Scroll pozisyonunu ayarla
              const leftPosition = CATEGORY_WIDTH + position;
              const scrollPosition = leftPosition - viewportWidth / 2;

              // Scroll yap
              gridContainer.scrollLeft = Math.max(0, scrollPosition);
            }
          }
        }
      };

      window.addEventListener("resize", handleWindowResize);

      // Component unmount olduğunda event listener'ları kaldır
      return () => {
        window.removeEventListener("resize", handleWindowResize);

        // Zamanlayıcıları temizle
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
      };
    }
  }, []);

  useEffect(() => {
    // Mobil cihazlarda dokunmatik etkileşimi iyileştirmek için
    const improveTouchInteraction = () => {
      // Grid container elementini bul
      const gridContainer = gridContainerRef.current;
      if (!gridContainer) return;

      // Tüm masa hücrelerini bul
      const tableCells = gridContainer.querySelectorAll("[data-table-id]");

      // Her masa hücresine touch-action: none ekle
      tableCells.forEach((cell) => {
        (cell as HTMLElement).style.touchAction = "none";
      });

      // Tüm rezervasyon kartlarına da uygula
      const reservationCards =
        gridContainer.querySelectorAll(".reservation-card");
      reservationCards.forEach((card) => {
        (card as HTMLElement).style.touchAction = "none";
      });
    };

    // Sayfa yüklendiğinde ve değişikliklerde çalıştır
    setTimeout(improveTouchInteraction, 1000);

    // Rezervasyonlar değiştiğinde tekrar çalıştır
    window.addEventListener("resize", improveTouchInteraction);

    return () => {
      window.removeEventListener("resize", improveTouchInteraction);
    };
  }, [reservations, tables]);

  // Saat formatını düzenleyen yardımcı fonksiyon
  const formatTimeForInput = (timeString: string): string => {
    try {
      // Tarih+saat formatı kontrolü yapıp sadece saat kısmını döndür
      if (timeString.includes("T")) {
        return timeString.split("T")[1].substring(0, 5);
      } else if (timeString.includes(" ")) {
        return timeString.split(" ")[1].substring(0, 5);
      }
      // Sadece saat formatındaysa olduğu gibi döndür
      return timeString.substring(0, 5);
    } catch (error) {
      console.error("Saat formatı düzenlenirken hata:", error);
      return "00:00"; // Hata durumunda varsayılan değer
    }
  };

  // Onay gösterme fonksiyonu - SweetAlert2 kullanarak yeniden yazıldı
  const showConfirmation = (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel: () => void
  ) => {
    console.log("showConfirmation çağrıldı:", { title, message });

    // SweetAlert2 ile şık bir onay dialog'u göster
    Swal.fire({
      title: title,
      html: message.replace(/\n/g, "<br>"),
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Onayla",
      cancelButtonText: "İptal",
      focusConfirm: false,
      customClass: {
        container: "swal-custom-container",
        popup: "swal-custom-popup",
        title: "swal-custom-title",
        confirmButton: "swal-custom-confirm",
        cancelButton: "swal-custom-cancel",
      },
    }).then((result) => {
      console.log("SweetAlert2 sonucu:", result);

      if (result.isConfirmed) {
        console.log("Kullanıcı onayladı, onConfirm çağrılıyor");
        try {
          onConfirm();
        } catch (error) {
          console.error("Onay fonksiyonu çalışırken hata oluştu:", error);
          toast.error("İşlem sırasında bir hata oluştu");
        }
      } else {
        console.log("Kullanıcı iptal etti, onCancel çağrılıyor");
        try {
          onCancel();
        } catch (error) {
          console.error("İptal fonksiyonu çalışırken hata oluştu:", error);
        }
      }
    });
  };

  // Rezervasyon kartlarını render et
  // Artık kullanılmıyor, kaldırılabilir

  // Son işlemi geri alma için state ve yardımcı değişkenler
  const [lastOperation, setLastOperation] = useState<{
    type: "move" | "resize" | "update";
    oldReservation: ReservationType;
    newReservation: ReservationType;
  } | null>(null);

  // Son işlemi geri alma
  const undoLastOperation = () => {
    if (!lastOperation) {
      toast.error("Geri alınacak işlem bulunamadı!");
      return;
    }

    try {
      // Eski rezervasyonu geri yükle
      updateReservation(lastOperation.oldReservation);

      // Bildirim göster
      toast.success("Son işlem geri alındı!");

      // Son işlem verisini temizle
      setLastOperation(null);
    } catch (error) {
      console.error("İşlem geri alınırken hata oluştu:", error);
      toast.error("İşlem geri alınamadı.");
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 text-gray-800">
      {/* Aktif rezervasyon bildirimleri */}
      <ActiveReservations />

      {/* Custom popup artık kullanılmıyor, native confirm kullanıyoruz */}
      {/* {showConfirmPopup && confirmTitle && confirmMessage && (
        <ConfirmationPopup />
      )} */}

      {/* Navbar */}
      <div className="flex justify-between items-center bg-white p-4 border-b border-gray-200 shadow-sm">
        <div className="flex items-center space-x-6">
          <div className="text-2xl font-bold text-blue-600">
            Rezervasyon Yönetimi
          </div>
          <div className="flex space-x-4">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Dashboard
            </button>
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
          <button
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-1"
            onClick={() => {
              if (
                confirm(
                  "Tüm test rezervasyonlarını temizlemek istediğinize emin misiniz?"
                )
              ) {
                // localStorage'ı temizle
                localStorage.removeItem("reservations");
                // Sayfayı yenile
                window.location.reload();
                toast.success("Tüm rezervasyonlar temizlendi.");
              }
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            <span>Temizle</span>
          </button>
          <span className="text-sm text-gray-600">Restoran Adı</span>
          <FiChevronDown className="text-gray-500" />
        </div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <button
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            onClick={goToToday}
          >
            <span>Today</span>
          </button>
          <div className="flex items-center space-x-2">
            <button
              aria-label="Önceki gün"
              className="p-2 rounded-lg hover:bg-gray-100"
              onClick={goToPreviousDay}
            >
              <BiArrowToLeft className="text-xl text-gray-600" />
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
              <BiArrowToRight className="text-xl text-gray-600" />
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <BiSearch className="absolute left-3 top-3 text-gray-500" />
            <input
              type="text"
              placeholder="Ara..."
              className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button className="p-2 rounded-lg hover:bg-gray-100">
            <IoMdRefresh className="text-xl text-gray-600" />
          </button>
          <button className="p-2 rounded-lg hover:bg-gray-100">
            <HiOutlineDotsVertical className="text-xl text-gray-600" />
          </button>
        </div>
      </div>

      {/* Ana içerik */}
      <div className="flex flex-1 overflow-hidden">
        {/* Ana tablo alanı - saat/masa gridleri ve rezervasyonlar */}
        <div
          className="flex-1 overflow-hidden flex flex-col"
          ref={mainContentRef}
        >
          <div
            ref={gridContainerRef}
            className="h-[calc(100vh-250px)] overflow-auto relative"
            onMouseLeave={handleMainContentLeave}
          >
            {/* Boş durum mesajını kaldırdık, toast bildirimi kullanılacak */}

            <div
              className="relative"
              style={{
                width: `${CATEGORY_WIDTH + hours.length * cellWidth}px`,
                minWidth: "100%",
              }}
            >
              {/* Saatler başlık satırı - Sticky */}
              <div className="sticky top-0 z-20 flex bg-white border-b border-gray-200">
                {/* Kategoriler için boş alan */}
                <div
                  className="flex-shrink-0 bg-white border-r border-gray-200 sticky left-0 z-30"
                  style={{
                    width: `${CATEGORY_WIDTH}px`,
                    height: `${cellHeight}px`,
                  }}
                ></div>

                {/* Saat başlıkları */}
                <div className="flex flex-1">
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="border-r border-gray-200 flex flex-col justify-center items-center"
                      style={{
                        width: `${cellWidth}px`,
                        height: `${cellHeight}px`,
                      }}
                    >
                      <div className="font-medium text-sm text-gray-700">
                        {hour}
                      </div>
                      <div
                        className={`text-xs font-medium ${
                          getGuestCountForHour(hour) > 30
                            ? "text-blue-600"
                            : getGuestCountForHour(hour) > 0
                            ? "text-gray-500"
                            : "text-gray-400"
                        }`}
                      >
                        {getGuestCountForHour(hour)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mevcut zaman çizgisi - Kırmızı dikey çizgi - Z-indeks artırıldı ve çizgi kalınlaştırıldı */}
                {currentTimePosition !== null &&
                  format(selectedDate, "yyyy-MM-dd") ===
                    format(new Date(), "yyyy-MM-dd") && (
                    <div
                      className="absolute top-0 bottom-0 w-[2px] bg-red-600 z-50 pointer-events-none hover:w-[3px] group transition-all duration-300"
                      style={{
                        left: `${CATEGORY_WIDTH + currentTimePosition}px`,
                        height: "100%",
                        boxShadow: "0 0 5px rgba(239, 68, 68, 0.5)",
                      }}
                    >
                      {/* Saati gösteren bilgi kutusu - sadece hover olduğunda görünür */}
                      <div className="hidden group-hover:block absolute -top-2 left-1/2 transform -translate-x-1/2 bg-red-600 text-white text-xs font-bold rounded-sm px-2 py-1 whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {currentTime}
                      </div>
                    </div>
                  )}
              </div>

              {/* Kategori isimleri yan tarafta */}
              {tableCategories.map((category) => (
                <div key={category.id}>
                  <div className="flex">
                    {/* Kategori adı sol tarafta */}
                    <div
                      className="flex-shrink-0 flex items-center px-4 border-b border-r font-semibold text-gray-600 text-sm sticky left-0 z-10"
                      style={{
                        width: `${CATEGORY_WIDTH}px`,
                        height: `${cellHeight}px`,
                        borderColor: category.borderColor,
                        borderBottomWidth: "2px",
                        backgroundColor: getLighterColor(category.color),
                      }}
                    >
                      {category.name}
                    </div>

                    {/* Saat çizelgesinde kategori başlığı için boş alan */}
                    <div
                      className="flex-1 border-b"
                      style={{
                        height: `${cellHeight}px`,
                        borderBottomColor: category.borderColor,
                        borderBottomWidth: "2px",
                        backgroundColor: category.backgroundColor || "white",
                      }}
                    ></div>
                  </div>

                  {/* Bu kategorideki masalar */}
                  {tables
                    .filter((table) => table.categoryId === category.id)
                    .map((table) => (
                      <div
                        key={table.id}
                        className="flex relative border-t border-gray-200"
                        style={{ height: `${cellHeight}px` }}
                        data-table-id={table.id}
                      >
                        {/* Masa bilgisi sol tarafta - sticky yapıyoruz */}
                        <div
                          className={`flex-shrink-0 flex items-center px-4 border-r border-gray-200 sticky left-0 z-10 ${
                            isTableSelected(table.id) ? "bg-blue-50" : ""
                          }`}
                          style={{
                            width: `${CATEGORY_WIDTH}px`,
                            height: `${cellHeight}px`,
                            backgroundColor: isTableSelected(table.id)
                              ? "rgba(219, 234, 254, 0.8)"
                              : category.backgroundColor || "#f9fafb",
                          }}
                          onClick={() => toggleTableSelection(table.id)}
                        >
                          <div className="flex items-center w-full">
                            <div className="flex items-center flex-1">
                              <div
                                className={`w-4 h-4 rounded mr-2 flex items-center justify-center ${
                                  isTableSelected(table.id)
                                    ? "bg-blue-500 text-white"
                                    : "border border-gray-300"
                                }`}
                              >
                                {isTableSelected(table.id) && (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-3 w-3"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                )}
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center">
                                  <div
                                    className="w-2 h-2 rounded-full mr-2"
                                    style={{
                                      backgroundColor: category.borderColor,
                                    }}
                                  ></div>
                                  <span className="text-sm font-medium mr-2">
                                    {table.number}
                                  </span>
                                  <span className="text-xs text-gray-500 flex items-center">
                                    <FiUsers className="mr-1" />
                                    {table.capacity}
                                  </span>
                                </div>

                                {/* Atanmış garsonlar */}
                                {getAssignedStaffNames(table.id).length > 0 && (
                                  <div className="text-xs text-gray-600 mt-1 italic">
                                    {getAssignedStaffNames(table.id).join(", ")}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Saat hücreleri */}
                        <div className="flex flex-1 relative">
                          {hours.map((hour) => {
                            // Saatin geçmiş olup olmadığını kontrol et
                            const isPastHour = isTimePast(hour);

                            // Bu hücrenin kırmızı çizgi ile kesişimini kontrol et
                            const intersection =
                              getCellRedLineIntersection(hour);

                            return (
                              <div
                                key={`${table.id}-${hour}`}
                                className={`border-r border-gray-200 relative ${
                                  isPastHour && !intersection.intersects
                                    ? "bg-gray-100 cursor-not-allowed"
                                    : "cursor-pointer hover:bg-blue-50"
                                } table-row`}
                                style={{
                                  width: `${cellWidth}px`,
                                  height: `${cellHeight}px`,
                                  backgroundColor:
                                    hour === currentTime.substring(0, 5)
                                      ? "rgba(255, 255, 255, 0.5)"
                                      : isPastHour && !intersection.intersects
                                      ? "rgba(243, 244, 246, 0.7)"
                                      : "white",
                                  position: "relative",
                                  overflow: "hidden",
                                }}
                                data-hour={hour}
                                data-table={table.number}
                                data-table-id={table.id}
                                data-past-hour={isPastHour.toString()}
                                onClick={(e) => {
                                  // Eğer hücre kırmızı çizgi tarafından bölünüyorsa özel işlem
                                  if (intersection.intersects) {
                                    const rect =
                                      e.currentTarget.getBoundingClientRect();
                                    handleEmptyCellClick(
                                      table.id,
                                      hour,
                                      e.clientX,
                                      rect
                                    );
                                    return;
                                  }

                                  // Geçmiş saatler için işlem yapma
                                  if (isPastHour) {
                                    return;
                                  }

                                  e.stopPropagation();
                                  const clickedHour =
                                    e.currentTarget.getAttribute("data-hour");
                                  const clickedTableId =
                                    e.currentTarget.getAttribute(
                                      "data-table-id"
                                    );
                                  if (clickedHour && clickedTableId) {
                                    handleEmptyCellClick(
                                      clickedTableId,
                                      clickedHour
                                    );
                                  } else {
                                    toast.error("Hücre bilgileri alınamadı!");
                                  }
                                }}
                              >
                                {/* Kırmızı çizgi tarafından kesilen hücrelerde sol tarafı pasif olarak göster */}
                                {intersection.intersects &&
                                  intersection.position !== null && (
                                    <div
                                      className="absolute top-0 left-0 h-full bg-gray-100 pointer-events-none"
                                      style={{
                                        width: `${
                                          intersection.position * 100
                                        }%`,
                                        borderRight: "1px dashed #ef4444",
                                      }}
                                    />
                                  )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Rezervasyonlar - Grid hücreleriyle uyumlu hale getirildi */}
                        <div
                          className="absolute top-0 h-full pointer-events-none overflow-visible"
                          style={{
                            left: `${CATEGORY_WIDTH}px`,
                            width: `calc(100% - ${CATEGORY_WIDTH}px)`,
                            height: `${cellHeight}px`,
                          }}
                        >
                          {/* Debug çizgileri - saatleri görsel olarak göstermek için */}
                          {hours.map((hour, idx) => (
                            <div
                              key={`debug-line-${hour}`}
                              className="absolute top-0 h-full border-l border-blue-200 opacity-0 hover:opacity-30"
                              style={{
                                left: `${idx * cellWidth}px`,
                                width: "1px",
                                height: `${cellHeight}px`,
                                zIndex: 0,
                              }}
                            />
                          ))}

                          {reservations
                            .filter((res) => res.tableId === table.id)
                            .map((reservation) => {
                              const position = getReservationPosition(
                                reservation.startTime,
                                reservation.endTime
                              );

                              return (
                                <DraggableReservationCard
                                  key={`${reservation.id}_${forceUpdate}`}
                                  reservation={reservation}
                                  cellWidth={cellWidth}
                                  cellHeight={cellHeight}
                                  position={position}
                                  categoryColor={category.color}
                                  categoryBorderColor={category.borderColor}
                                  onReservationClick={(res) => {
                                    handleReservationClick(res);
                                    setSidebarClicked(true);
                                    setSidebarOpenedByHover(false);
                                  }}
                                  onReservationHover={handleReservationHover}
                                  onReservationLeave={handleReservationLeave}
                                  onReservationUpdate={updateReservation}
                                  hasTableConflict={hasTableConflict}
                                  reservationColor={getReservationColor(
                                    reservation
                                  )}
                                  reservationStatuses={reservationStatuses}
                                  isReservationPast={isReservationPast}
                                  showConfirmation={showConfirmation}
                                />
                              );
                            })}
                        </div>
                      </div>
                    ))}
                </div>
              ))}

              {/* Güncel saat çizgisi - Ana tablo alanında */}
              {currentTimePosition !== null &&
                format(selectedDate, "yyyy-MM-dd") ===
                  format(new Date(), "yyyy-MM-dd") && (
                  <div
                    className="absolute border-l-[2px] border-red-600 z-50 group cursor-pointer transition-all duration-300 hover:border-l-[3px]"
                    style={{
                      left: `${CATEGORY_WIDTH + currentTimePosition}px`,
                      top: "0",
                      height: "100%",
                      pointerEvents: "auto",
                      boxShadow: "0 0 5px rgba(239, 68, 68, 0.5)",
                    }}
                  >
                    {/* Saati gösteren bilgi kutusu - sadece hover olduğunda görünür */}
                    <div className="absolute left-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-red-600 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap z-50">
                      {currentTime}
                    </div>
                  </div>
                )}
            </div>
          </div>

          {/* Footer Bölümü - Zoom kontrollerini sağ tarafa eklenmiş haliyle */}
          <div className="h-[60px] bg-white border-t border-gray-200 flex items-center justify-between px-4 text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded bg-blue-600 mr-2"></div>
                <span>Onaylanmış Rezervasyon</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded bg-blue-600 mr-2 opacity-70"></div>
                <span>Bekleyen Rezervasyon</span>
              </div>
              <div>Toplam Misafir: {totalGuestCount} kişi</div>
            </div>

            {/* Zoom kontrolleri - sağ tarafta */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleZoomOut}
                className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                disabled={zoomLevel <= minZoom}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-gray-700"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min={minZoom}
                  max={maxZoom}
                  value={zoomLevel}
                  onChange={handleZoomChange}
                  className="w-24 h-1.5 appearance-none bg-gray-300 rounded-lg focus:outline-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${
                      ((zoomLevel - minZoom) / (maxZoom - minZoom)) * 100
                    }%, #D1D5DB ${
                      ((zoomLevel - minZoom) / (maxZoom - minZoom)) * 100
                    }%, #D1D5DB 100%)`,
                  }}
                />
                <span className="text-xs font-medium text-gray-700 w-12 text-center">
                  {zoomLevel}%
                </span>
              </div>

              <button
                onClick={handleZoomIn}
                className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                disabled={zoomLevel >= maxZoom}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-gray-700"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              <button
                onClick={handleZoomReset}
                className="px-2 py-1 rounded text-xs font-medium bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700"
              >
                Sıfırla
              </button>

              <div className="h-8 border-l border-gray-300 mx-1"></div>

              <div className="flex items-center space-x-2">
                <div className="flex flex-col items-center">
                  <label className="text-xs text-gray-600 mb-0.5">
                    Genişlik
                  </label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      min="80"
                      max="300"
                      value={cellWidth}
                      onChange={handleCellWidthChange}
                      className="w-14 h-6 text-xs border border-gray-300 rounded px-1 py-0.5"
                    />
                    <span className="text-xs ml-0.5">px</span>
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <label className="text-xs text-gray-600 mb-0.5">
                    Yükseklik
                  </label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      min="30"
                      max="100"
                      value={cellHeight}
                      onChange={handleCellHeightChange}
                      className="w-14 h-6 text-xs border border-gray-300 rounded px-1 py-0.5"
                    />
                    <span className="text-xs ml-0.5">px</span>
                  </div>
                </div>

                <button
                  onClick={resetCellDimensions}
                  title="Hücre boyutlarını sıfırla"
                  className="w-6 h-6 mt-4 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5 text-gray-700"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sağ kenar çubuğu - Rezervasyon detayları ve düzenleme */}
        {isRightSidebarOpen && selectedReservation && (
          <div
            className="w-96 bg-white border-l border-gray-200 h-full overflow-y-auto flex flex-col"
            onClick={handleSidebarClick} // Sidebar'a tıklama işlevi
            onMouseEnter={() => setSidebarClicked(true)} // Mouse sidebar'a girdiğinde de açık tut
          >
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center">
                <h2 className="text-lg font-semibold">Rezervasyon Detayları</h2>
                {isReservationPast &&
                  isReservationPast(selectedReservation) && (
                    <span className="ml-2 text-xs font-medium bg-red-600 text-white px-2 py-1 rounded-full">
                      Geçmiş
                    </span>
                  )}
              </div>
              <button
                onClick={closeRightSidebar}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Müşteri durumu butonları */}
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    handleReservationStatusChange(
                      selectedReservation.id,
                      "arrived"
                    )
                  }
                  className={`flex-1 py-2 px-3 rounded-md ${
                    reservationStatuses[selectedReservation.id] === "arrived"
                      ? "bg-pink-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-pink-500 hover:text-white"
                  } transition-colors ${
                    isReservationPast(selectedReservation)
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  disabled={isReservationPast(selectedReservation)}
                >
                  Müşteri Geldi
                </button>
                <button
                  onClick={() =>
                    handleReservationStatusChange(
                      selectedReservation.id,
                      "departed"
                    )
                  }
                  className={`flex-1 py-2 px-3 rounded-md ${
                    reservationStatuses[selectedReservation.id] === "departed"
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-900 hover:text-white"
                  } transition-colors ${
                    isReservationPast(selectedReservation)
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  disabled={isReservationPast(selectedReservation)}
                >
                  Müşteri Gitti
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4 flex-1">
              {/* Müşteri Bilgileri */}
              <div>
                <h3 className="text-md font-medium mb-2">Müşteri Bilgileri</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600">
                      Müşteri Adı
                    </label>
                    <input
                      type="text"
                      value={selectedReservation.customerName}
                      onChange={(e) =>
                        setSelectedReservation({
                          ...selectedReservation,
                          customerName: e.target.value,
                        })
                      }
                      className={`w-full p-2 border border-gray-300 rounded mt-1 ${
                        isReservationPast(selectedReservation)
                          ? "bg-gray-100 cursor-not-allowed"
                          : ""
                      }`}
                      disabled={isReservationPast(selectedReservation)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600">
                      Misafir Sayısı
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={selectedReservation.guestCount}
                      onChange={(e) =>
                        setSelectedReservation({
                          ...selectedReservation,
                          guestCount: parseInt(e.target.value),
                        })
                      }
                      className={`w-full p-2 border border-gray-300 rounded mt-1 ${
                        isReservationPast(selectedReservation)
                          ? "bg-gray-100 cursor-not-allowed"
                          : ""
                      }`}
                      disabled={isReservationPast(selectedReservation)}
                    />
                  </div>
                </div>
              </div>

              {/* Rezervasyon Bilgileri */}
              <div>
                <h3 className="text-md font-medium mb-2">
                  Rezervasyon Bilgileri
                </h3>
                <div className="space-y-3">
                  {/* Masa Değiştirme */}
                  <div>
                    <label className="block text-sm text-gray-600">
                      Masa Değiştir
                    </label>

                    <div className="mb-2 p-2 border border-gray-200 rounded bg-gray-50">
                      {(() => {
                        const currentTable = tables.find(
                          (t) => t.id === selectedReservation.tableId
                        );
                        const currentCategory = tableCategories.find(
                          (c) => c.id === currentTable?.categoryId
                        );

                        return currentTable ? (
                          <div className="flex items-center">
                            <div
                              className="w-3 h-3 rounded-full mr-2"
                              style={{
                                backgroundColor: currentCategory?.borderColor,
                              }}
                            ></div>
                            <span className="font-medium text-sm">
                              Şu anki masa: {currentTable.number} (
                              {currentCategory?.name}) - {currentTable.capacity}{" "}
                              kişilik
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">
                            Masa bilgisi bulunamadı
                          </span>
                        );
                      })()}
                    </div>

                    {/* Masa seçimi dropdown */}
                    <select
                      value={selectedReservation.tableId}
                      onChange={(e) => {
                        const newTableId = e.target.value;
                        const selectedTable = tables.find(
                          (t) => t.id === newTableId
                        );

                        if (selectedTable) {
                          console.log(
                            `Masa değişikliği: ${selectedReservation.tableId} -> ${newTableId}`
                          );

                          // Kapasite kontrolü
                          if (
                            selectedTable.capacity <
                            selectedReservation.guestCount
                          ) {
                            toast.error(
                              `Seçilen masa kapasitesi (${selectedTable.capacity}) misafir sayısından (${selectedReservation.guestCount}) az!`
                            );
                            return;
                          }

                          // Çakışma kontrolü
                          if (
                            hasTableConflict(
                              newTableId,
                              selectedReservation.startTime,
                              selectedReservation.endTime,
                              selectedReservation.id
                            )
                          ) {
                            toast.error(
                              "Bu masa ve saatte başka bir rezervasyon var. Lütfen farklı bir masa seçin."
                            );
                            return;
                          }

                          // Masa değişikliğini güvenli bir şekilde uygula
                          setSelectedReservation({
                            ...selectedReservation,
                            tableId: newTableId,
                          });

                          // Bilgilendirme mesajı
                          const tableCategory = tableCategories.find(
                            (c) => c.id === selectedTable.categoryId
                          );
                          toast.success(
                            `Masa ${selectedTable.number}'e taşındı (${tableCategory?.name}, ${selectedTable.capacity} kişilik)`
                          );
                        } else {
                          toast.error("Masa bulunamadı");
                        }
                      }}
                      className={`w-full p-2 border border-gray-300 rounded ${
                        isReservationPast(selectedReservation)
                          ? "bg-gray-100 cursor-not-allowed"
                          : ""
                      }`}
                      disabled={isReservationPast(selectedReservation)}
                    >
                      {tableCategories.map((category) => (
                        <optgroup key={category.id} label={category.name}>
                          {tables
                            .filter((table) => table.categoryId === category.id)
                            .map((table) => (
                              <option key={table.id} value={table.id}>
                                Masa {table.number} ({table.capacity} kişilik)
                              </option>
                            ))}
                        </optgroup>
                      ))}
                    </select>

                    {/* Hızlı masa değiştirme butonları - geçmiş rezervasyonlar için gizle */}
                    {!isReservationPast(selectedReservation) && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {tableCategories.map((category) => {
                          // Her kategoriden kapasiteye göre masaları göster
                          const smallTable = tables.find(
                            (t) =>
                              t.categoryId === category.id && t.capacity <= 2
                          );
                          const mediumTable = tables.find(
                            (t) =>
                              t.categoryId === category.id &&
                              t.capacity >= 3 &&
                              t.capacity <= 4
                          );
                          const largeTable = tables.find(
                            (t) =>
                              t.categoryId === category.id && t.capacity >= 6
                          );

                          return smallTable || mediumTable || largeTable ? (
                            <div
                              key={category.id}
                              className="flex flex-col space-y-1"
                            >
                              <div
                                className="text-xs font-medium text-center"
                                style={{ color: category.borderColor }}
                              >
                                {category.name}
                              </div>
                              <div className="flex justify-between space-x-1">
                                {smallTable && (
                                  <button
                                    onClick={() => {
                                      const newReservation = {
                                        ...selectedReservation,
                                        tableId: smallTable.id,
                                      };
                                      setSelectedReservation(newReservation);
                                      toast.success(
                                        `Masa ${smallTable.number}'e taşındı`
                                      );
                                    }}
                                    className="flex-1 py-1 text-xs rounded text-white"
                                    style={{
                                      backgroundColor: category.borderColor,
                                    }}
                                  >
                                    S{smallTable.number}
                                  </button>
                                )}
                                {mediumTable && (
                                  <button
                                    onClick={() => {
                                      const newReservation = {
                                        ...selectedReservation,
                                        tableId: mediumTable.id,
                                      };
                                      setSelectedReservation(newReservation);
                                      toast.success(
                                        `Masa ${mediumTable.number}'e taşındı`
                                      );
                                    }}
                                    className="flex-1 py-1 text-xs rounded text-white"
                                    style={{
                                      backgroundColor: category.borderColor,
                                    }}
                                  >
                                    M{mediumTable.number}
                                  </button>
                                )}
                                {largeTable && (
                                  <button
                                    onClick={() => {
                                      const newReservation = {
                                        ...selectedReservation,
                                        tableId: largeTable.id,
                                      };
                                      setSelectedReservation(newReservation);
                                      toast.success(
                                        `Masa ${largeTable.number}'e taşındı`
                                      );
                                    }}
                                    className="flex-1 py-1 text-xs rounded text-white"
                                    style={{
                                      backgroundColor: category.borderColor,
                                    }}
                                  >
                                    L{largeTable.number}
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-600">
                        Başlangıç Saati
                      </label>
                      <input
                        type="time"
                        value={formatTimeForInput(
                          selectedReservation.startTime
                        )}
                        onChange={(e) => {
                          const newStartTime = e.target.value;
                          // Tam saatin nasıl saklandığını kontrol et
                          let formattedStartTime = newStartTime;
                          // Eğer orijinal değerde tarih varsa, tarihi koru
                          if (selectedReservation.startTime.includes("T")) {
                            const datePart =
                              selectedReservation.startTime.split("T")[0];
                            formattedStartTime = `${datePart}T${newStartTime}`;
                          } else if (
                            selectedReservation.startTime.includes(" ")
                          ) {
                            const datePart =
                              selectedReservation.startTime.split(" ")[0];
                            formattedStartTime = `${datePart} ${newStartTime}`;
                          }

                          // Başlangıç saatinden 1 saat sonrasını bitiş saati olarak ayarla
                          const [hours, minutes] = newStartTime
                            .split(":")
                            .map(Number);
                          let endHour = hours + 1;
                          // Saat 24'ü geçerse düzeltme yap
                          if (endHour >= 24) {
                            endHour = endHour - 24;
                          }
                          const endTime = `${endHour
                            .toString()
                            .padStart(2, "0")}:${minutes
                            .toString()
                            .padStart(2, "0")}`;

                          // Bitiş saati için de aynı tarih formatını koru
                          let formattedEndTime = endTime;
                          if (selectedReservation.endTime.includes("T")) {
                            const datePart =
                              selectedReservation.endTime.split("T")[0];
                            formattedEndTime = `${datePart}T${endTime}`;
                          } else if (
                            selectedReservation.endTime.includes(" ")
                          ) {
                            const datePart =
                              selectedReservation.endTime.split(" ")[0];
                            formattedEndTime = `${datePart} ${endTime}`;
                          }

                          setSelectedReservation({
                            ...selectedReservation,
                            startTime: formattedStartTime,
                            endTime: formattedEndTime,
                          });
                        }}
                        className={`w-full p-2 border border-gray-300 rounded mt-1 ${
                          isReservationPast(selectedReservation)
                            ? "bg-gray-100 cursor-not-allowed"
                            : ""
                        }`}
                        disabled={isReservationPast(selectedReservation)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600">
                        Bitiş Saati
                      </label>
                      <input
                        type="time"
                        value={formatTimeForInput(selectedReservation.endTime)}
                        onChange={(e) => {
                          const newEndTime = e.target.value;
                          // Tam saatin nasıl saklandığını kontrol et
                          let formattedEndTime = newEndTime;
                          // Eğer orijinal değerde tarih varsa, tarihi koru
                          if (selectedReservation.endTime.includes("T")) {
                            const datePart =
                              selectedReservation.endTime.split("T")[0];
                            formattedEndTime = `${datePart}T${newEndTime}`;
                          } else if (
                            selectedReservation.endTime.includes(" ")
                          ) {
                            const datePart =
                              selectedReservation.endTime.split(" ")[0];
                            formattedEndTime = `${datePart} ${newEndTime}`;
                          }

                          setSelectedReservation({
                            ...selectedReservation,
                            endTime: formattedEndTime,
                          });
                        }}
                        className={`w-full p-2 border border-gray-300 rounded mt-1 ${
                          isReservationPast(selectedReservation)
                            ? "bg-gray-100 cursor-not-allowed"
                            : ""
                        }`}
                        disabled={isReservationPast(selectedReservation)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600">
                      Rezervasyon Durumu
                    </label>
                    <select
                      value={selectedReservation.status}
                      onChange={(e) =>
                        setSelectedReservation({
                          ...selectedReservation,
                          status: e.target.value as
                            | "confirmed"
                            | "pending"
                            | "cancelled",
                        })
                      }
                      className={`w-full p-2 border border-gray-300 rounded mt-1 ${
                        isReservationPast(selectedReservation)
                          ? "bg-gray-100 cursor-not-allowed"
                          : ""
                      }`}
                      disabled={isReservationPast(selectedReservation)}
                    >
                      <option value="confirmed">Onaylandı</option>
                      <option value="pending">Beklemede</option>
                      <option value="cancelled">İptal Edildi</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600">
                      Rezervasyon Notu
                    </label>
                    <textarea
                      value={selectedReservation.note || ""}
                      onChange={(e) =>
                        setSelectedReservation({
                          ...selectedReservation,
                          note: e.target.value,
                        })
                      }
                      className={`w-full p-2 border border-gray-300 rounded mt-1 h-20 ${
                        isReservationPast(selectedReservation)
                          ? "bg-gray-100 cursor-not-allowed"
                          : ""
                      }`}
                      placeholder="Özel istekler, notlar..."
                      disabled={isReservationPast(selectedReservation)}
                    ></textarea>
                  </div>
                </div>
              </div>

              {/* Garson Ataması */}
              <div>
                <h3 className="text-md font-medium mb-2">Garson Ataması</h3>
                <div className="space-y-3">
                  <div
                    className={`max-h-40 overflow-y-auto border border-gray-300 rounded p-2 ${
                      isReservationPast(selectedReservation)
                        ? "bg-gray-100"
                        : ""
                    }`}
                  >
                    {staff.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center space-x-2 py-1"
                      >
                        <input
                          type="checkbox"
                          id={`staff-${s.id}`}
                          checked={
                            selectedReservation.staffIds?.includes(s.id) ||
                            false
                          }
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            const currentStaffIds =
                              selectedReservation.staffIds || [];

                            setSelectedReservation({
                              ...selectedReservation,
                              staffIds: isChecked
                                ? [...currentStaffIds, s.id]
                                : currentStaffIds.filter((id) => id !== s.id),
                            });
                          }}
                          className="h-4 w-4 text-blue-600"
                          disabled={isReservationPast(selectedReservation)}
                        />
                        <label htmlFor={`staff-${s.id}`} className="text-sm">
                          {s.name}{" "}
                          <span className="text-xs text-gray-500">
                            ({s.position})
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Rezervasyon Rengi */}
              <div>
                <h3 className="text-md font-medium mb-2">Rezervasyon Rengi</h3>
                <div
                  className={`flex space-x-2 ${
                    isReservationPast(selectedReservation)
                      ? "opacity-50 pointer-events-none"
                      : ""
                  }`}
                >
                  {[
                    "#3B82F6",
                    "#10B981",
                    "#F59E0B",
                    "#EF4444",
                    "#8B5CF6",
                    "#EC4899",
                  ].map((color) => (
                    <div
                      key={color}
                      onClick={() => {
                        if (isReservationPast(selectedReservation)) {
                          return; // Geçmiş rezervasyonlar için renk değiştirmeyi engelle
                        }
                        setSelectedReservation({
                          ...selectedReservation,
                          color,
                        });
                      }}
                      className={`w-8 h-8 rounded-full cursor-pointer ${
                        selectedReservation.color === color
                          ? "ring-2 ring-offset-2 ring-gray-500"
                          : ""
                      }`}
                      style={{ backgroundColor: color }}
                    ></div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200">
              {/* Geçmiş rezervasyonlar için bilgi mesajı */}
              {isReservationPast(selectedReservation) ? (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-md mb-3">
                  <div className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2 mt-0.5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div>
                      <p className="font-medium">
                        Bu rezervasyon geçmiş bir tarihte/saatte.
                      </p>
                      <p className="text-sm">
                        Bilgileri görüntüleyebilirsiniz ancak düzenleme
                        yapılamaz.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <button
                    onClick={() => updateReservation(selectedReservation)}
                    className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 flex justify-center items-center space-x-1"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Kaydet</span>
                  </button>
                  <button
                    onClick={closeRightSidebar}
                    className="bg-gray-200 text-gray-700 py-2 px-4 rounded hover:bg-gray-300 flex justify-center items-center space-x-1"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    <span>İptal</span>
                  </button>
                </div>
              )}

              {/* Geçmiş rezervasyonlar için kapat butonu */}
              {isReservationPast(selectedReservation) && (
                <button
                  onClick={closeRightSidebar}
                  className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded hover:bg-gray-300 flex justify-center items-center space-x-1"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  <span>Kapat</span>
                </button>
              )}

              {/* Tehlikeli İşlemler - sadece geçmiş olmayan rezervasyonlar için */}
              {!isReservationPast(selectedReservation) && (
                <div className="border-t border-gray-200 pt-3 space-y-2">
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          "Bu rezervasyonu iptal etmek istediğinize emin misiniz?"
                        )
                      ) {
                        const updatedReservation = {
                          ...selectedReservation,
                          status: "cancelled" as
                            | "confirmed"
                            | "pending"
                            | "cancelled",
                        };
                        updateReservation(updatedReservation);
                        closeRightSidebar();
                      }
                    }}
                    className="w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 flex justify-center items-center space-x-1"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    <span>Rezervasyonu İptal Et</span>
                  </button>

                  {/* Rezervasyon Silme Butonu */}
                  <button
                    onClick={() => deleteReservation(selectedReservation.id)}
                    className="w-full bg-red-700 text-white py-2 px-4 rounded hover:bg-red-800 flex justify-center items-center space-x-1"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    <span>Rezervasyonu Sil</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Global stil */}
      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* SweetAlert2 özel stilleri */
        .swal-custom-container {
          z-index: 99999 !important;
        }

        .swal-custom-popup {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            "Helvetica Neue", Arial !important;
          border-radius: 8px !important;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
        }

        .swal-custom-title {
          font-weight: 600 !important;
          font-size: 1.25rem !important;
        }

        .swal-custom-confirm {
          background-color: #3085d6 !important;
          padding: 0.5rem 1.25rem !important;
          border-radius: 0.375rem !important;
        }

        .swal-custom-cancel {
          background-color: #d33 !important;
          padding: 0.5rem 1.25rem !important;
          border-radius: 0.375rem !important;
        }

        /* Rezervasyon bildirim animasyonu */
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .animate-slideInRight {
          animation: slideInRight 0.5s ease-out forwards;
        }

        /* Animasyon */
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* Yeni rezervasyon vurgu animasyonu */
        @keyframes pulseHighlight {
          0%,
          100% {
            box-shadow: 0 0 0 rgba(59, 130, 246, 0.5);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.8);
            transform: scale(1.05);
          }
        }

        .highlight-new-reservation {
          animation: pulseHighlight 1.5s ease-in-out infinite;
          z-index: 20 !important;
        }
      `}</style>

      {/* Tooltip ile ilgili hiçbir şey yok artık */}

      {/* Garson Atama Modal */}
      {isStaffAssignmentModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className="bg-white rounded-lg shadow-xl w-96"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Garson Ataması</h2>
              <button
                onClick={closeStaffAssignmentModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-4">
              <div className="mb-4">
                <div className="font-medium text-gray-700 mb-2">
                  Seçilen Masalar:
                </div>
                <div className="text-sm bg-gray-50 p-2 rounded max-h-20 overflow-y-auto">
                  {selectedTables.length > 0 ? (
                    <ul className="list-disc pl-5">
                      {selectedTables.map((tableId) => {
                        const { number, category } = getTableInfo(tableId);
                        return (
                          <li key={tableId}>
                            Masa {number} ({category})
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="text-gray-500 italic">
                      Hiç masa seçilmedi
                    </div>
                  )}
                </div>
              </div>

              <StaffAssignmentForm
                staff={staff}
                selectedTables={selectedTables}
                onAssign={assignStaffToTables}
                onCancel={closeStaffAssignmentModal}
                initialSelectedStaff={currentSelectedStaff}
              />
            </div>
          </div>
        </div>
      )}

      {/* Masa Seçim Kontrol Paneli - En az bir masa seçildiğinde göster */}
      {selectedTables.length > 0 && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl border border-gray-200 z-40 flex items-center px-3 py-2 space-x-2">
          <span className="text-sm font-medium">
            {selectedTables.length} masa seçildi
          </span>
          <button
            onClick={openStaffAssignmentModal}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            Garson Ata
          </button>
          <button
            onClick={clearTableSelection}
            className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
          >
            Seçimi Temizle
          </button>
        </div>
      )}

      {/* Onay popup'ı */}
      {/* Popup zaten sayfa başında render ediliyor, burada tekrar render etmeye gerek yok */}

      {/* Geri alma butonu - Son işlem varsa göster */}
      {lastOperation && (
        <button
          onClick={undoLastOperation}
          className="fixed bottom-4 right-4 z-40 bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
          title="Son işlemi geri al"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
