"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useRef, useMemo } from "react";
import { format, subDays, addDays } from "date-fns";
import { tr } from "date-fns/locale";
import { BiSearch, BiArrowToRight, BiArrowToLeft } from "react-icons/bi";
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
import { supabase } from "@/lib/supabase/client";

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
  status: "available" | "unavailable" | "reserved";
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

  // useEffect ile localStorage'dan kategorileri yükle
  useEffect(() => {
    // Netlify dağıtımı ve SSG aşamasında atlanacak
    if (
      process.env.NEXT_PUBLIC_NETLIFY_DEPLOYMENT === "true" &&
      process.env.NEXT_PUBLIC_SKIP_SSG_ADMIN === "true" &&
      typeof window === "undefined"
    ) {
      return;
    }

    // localStorage'dan tableSettings'i yükle
    const savedTableSettings = localStorage.getItem("tableSettings");
    if (savedTableSettings) {
      try {
        const parsedSettings = JSON.parse(savedTableSettings);
        if (parsedSettings.categories && parsedSettings.categories.length > 0) {
          setTableCategories(parsedSettings.categories);
          console.log(
            "Kategoriler localStorage'dan yüklendi:",
            parsedSettings.categories
          );
        }
      } catch (error) {
        console.error("Kategori yükleme hatası:", error);
      }
    }
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
      // Saatleri ve dakikaları ayır
      const [startHourStr, startMinuteStr] = startTime.split(":");
      const [endHourStr, endMinuteStr] = endTime.split(":");

      // String değerlerini sayıya çevir
      const startHour = parseInt(startHourStr);
      const startMinute = parseInt(startMinuteStr);
      const endHour = parseInt(endHourStr);
      const endMinute = parseInt(endMinuteStr);

      // Zaman çizelgesinde hangi indekste olduğunu bul (hours dizisi indeksi)
      // Görsel grid'de saat 7'den başlar ve 7'den küçük saatler en sonda gösterilir
      let startColumnIndex = -1;
      let endColumnIndex = -1;

      // hours dizisinde başlangıç saatinin indeksini bul
      for (let i = 0; i < hours.length; i++) {
        const hourValue = parseInt(hours[i].split(":")[0]);
        if (hourValue === startHour) {
          startColumnIndex = i;
          break;
        }
      }

      // hours dizisinde bitiş saatinin indeksini bul
      for (let i = 0; i < hours.length; i++) {
        const hourValue = parseInt(hours[i].split(":")[0]);
        if (hourValue === endHour) {
          endColumnIndex = i;
          break;
        }
      }

      // Eğer indeksler bulunamadıysa hata durumu
      if (startColumnIndex === -1 || endColumnIndex === -1) {
        console.error("Saat indeksleri bulunamadı", startTime, endTime);
        return { left: "0px", width: "80px" };
      }

      // Gece yarısını geçen rezervasyonlar için özel durum
      // Örneğin: 23:00 - 01:00
      if (startHour > endHour) {
        // 1, 2 gibi küçük saatler, dizide en sonda (gece yarısından sonra) yer alır
        endColumnIndex = hours.length - (24 - endHour);
      }

      // Başlangıç soldan pozisyonu
      const startPosition =
        startColumnIndex * cellWidth + (startMinute / 60) * cellWidth;

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
        // Gece yarısını geçen durumlar
        const columnSpan = hours.length - startColumnIndex + endColumnIndex;
        width =
          columnSpan * cellWidth +
          (endMinute / 60) * cellWidth -
          (startMinute / 60) * cellWidth;
      }

      // Minimum genişlik kontrolü
      const finalWidth = Math.max(width, 80); // En az 80px genişlik

      // Kartlar için kenar boşluğu hesabını burada yapalım
      return {
        left: `${startPosition}px`,
        width: `${finalWidth}px`,
      };
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
  };

  // Hover yönetimi için global bir referans değişkeni ekleyelim
  // Bu özellikle kartlar arası geçişlerde stabilite sağlayacak
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Yeni eklenen rezervasyon referansı - animasyon için
  const newReservationRef = useRef<string | null>(null);

  // Boş hücre için hover state'i - ARTIK GEREKLİ DEĞİL, KALDIRIYORUZ
  // const [hoveredEmptyCell, setHoveredEmptyCell] = useState<{tableId: string, hour: string} | null>(null);

  // Rezervasyon hover durumunda - Sadece rezervasyon kartları için
  const handleReservationHover = (reservation: ReservationType) => {
    // Eğer sidebar tıklama ile açık durumdaysa, hover özelliğini devre dışı bırak
    if (sidebarClicked) return;

    // Hover durumunda seçili rezervasyonu güncelle
    setSelectedReservation(reservation);

    // Sidebar'ı hemen aç
    setIsRightSidebarOpen(true);
    setSidebarOpenedByHover(true);
  };

  // Hover durumu bittiğinde - Hemen kapat
  const handleReservationLeave = () => {
    // Eğer sidebar hover ile açıldıysa, hemen kapat (bekleme yok)
    if (sidebarOpenedByHover && !sidebarClicked) {
      setIsRightSidebarOpen(false);
      setSidebarOpenedByHover(false);
    }
  };

  // Boş bir hücreye tıklandığında yeni rezervasyon oluşturma işlemi başlatır
  const handleEmptyCellClick = (tableId: string, hour: string) => {
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

    // Bu masa ve saatte işlem yapılıyor mu kontrol et
    const isTableBeingProcessed = activeForms.some(
      (form) => form.tableId === tableId && form.startTime === hour
    );

    if (isTableBeingProcessed) {
      toast.error("Bu masa ve saat için başka bir işlem devam ediyor!");
      return;
    }

    // Çakışma kontrolü
    const hourParts = hour.split(":");
    const startHour = parseInt(hourParts[0]);
    const endTimeStr = `${startHour + 1}:00`;

    const conflict = reservations.some(
      (res) =>
        res.tableId === tableId &&
        hasTimeOverlap(hour, endTimeStr, res.startTime, res.endTime)
    );

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
      startTime: hour,
      endTime: endTimeStr, // 1 saat süre varsayılan
      status: "pending",
    };

    // Yeni bir işlem ekle
    const newForm = {
      id: `form-${Date.now()}`,
      tableId,
      startTime: hour,
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
    // Saatleri dakikaya çevir
    const convertTimeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(":").map(Number);
      return hours * 60 + minutes;
    };

    const start1Min = convertTimeToMinutes(start1);
    const end1Min = convertTimeToMinutes(end1);
    const start2Min = convertTimeToMinutes(start2);
    const end2Min = convertTimeToMinutes(end2);

    // Gece yarısını geçen rezervasyonlar için düzeltme
    const adjustedEnd1Min = end1Min <= start1Min ? end1Min + 24 * 60 : end1Min;
    const adjustedEnd2Min = end2Min <= start2Min ? end2Min + 24 * 60 : end2Min;

    // Çakışma kontrolü: iki zaman aralığı çakışıyorsa true döndür
    return (
      (start1Min < adjustedEnd2Min && adjustedEnd1Min > start2Min) ||
      (start2Min < adjustedEnd1Min && adjustedEnd2Min > start1Min)
    );
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
  };

  // sidebar durumlarını izlemek için state ekle
  const [sidebarOpenedByHover, setSidebarOpenedByHover] = useState(false);
  const [sidebarClicked, setSidebarClicked] = useState(false);

  // Aktif rezervasyon formlarını izle ve görüntüle
  const [activeForms, setActiveForms] = useState<ActiveFormType[]>([]);

  // Masalar için state
  const [tables, setTables] = useState<TableType[]>([]);

  // Masaları yükleme fonksiyonu
  const loadTables = () => {
    try {
      // localStorage'dan tabloları yükle
      const savedTables = localStorage.getItem("tables");
      if (savedTables) {
        const parsedTables = JSON.parse(savedTables);
        setTables(parsedTables);
      } else {
        // Varsayılan masa verileri
        const defaultTables: TableType[] = [
          // TERAS kategorisindeki masalar
          {
            id: "t1",
            number: 1,
            capacity: 2,
            status: "available",
            categoryId: "1",
          },
          {
            id: "t2",
            number: 2,
            capacity: 4,
            status: "available",
            categoryId: "1",
          },
          {
            id: "t3",
            number: 3,
            capacity: 6,
            status: "available",
            categoryId: "1",
          },
          {
            id: "t4",
            number: 4,
            capacity: 8,
            status: "available",
            categoryId: "1",
          },
          {
            id: "t5",
            number: 5,
            capacity: 2,
            status: "available",
            categoryId: "1",
          },

          // BAHÇE kategorisindeki masalar
          {
            id: "b1",
            number: 6,
            capacity: 2,
            status: "available",
            categoryId: "2",
          },
          {
            id: "b2",
            number: 7,
            capacity: 4,
            status: "available",
            categoryId: "2",
          },
          {
            id: "b3",
            number: 8,
            capacity: 6,
            status: "available",
            categoryId: "2",
          },
          {
            id: "b4",
            number: 9,
            capacity: 8,
            status: "available",
            categoryId: "2",
          },

          // İÇ SALON kategorisindeki masalar
          {
            id: "i1",
            number: 10,
            capacity: 2,
            status: "available",
            categoryId: "3",
          },
          {
            id: "i2",
            number: 11,
            capacity: 4,
            status: "available",
            categoryId: "3",
          },
          {
            id: "i3",
            number: 12,
            capacity: 6,
            status: "available",
            categoryId: "3",
          },
          {
            id: "i4",
            number: 13,
            capacity: 8,
            status: "available",
            categoryId: "3",
          },
        ];

        setTables(defaultTables);
        localStorage.setItem("tables", JSON.stringify(defaultTables));
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
    const reservationsForTable = reservations.filter(
      (r) =>
        r.tableId === tableId &&
        (excludeReservationId ? r.id !== excludeReservationId : true)
    );

    // Başlangıç ve bitiş zamanlarını karşılaştır
    const newStartTime = new Date(startTime).getTime();
    const newEndTime = new Date(endTime).getTime();

    // Herhangi bir çakışma var mı kontrol et
    return reservationsForTable.some((r) => {
      const existingStartTime = new Date(r.startTime).getTime();
      const existingEndTime = new Date(r.endTime).getTime();

      // Çakışma kontrolü
      // Eğer yeni rezervasyon başlangıcı, mevcut rezervasyonun bitiş zamanından önce
      // VE yeni rezervasyon bitişi, mevcut rezervasyonun başlangıç zamanından sonra ise
      // bu bir çakışma demektir.
      return (
        (newStartTime < existingEndTime && newEndTime > existingStartTime) ||
        (existingStartTime < newEndTime && existingEndTime > newStartTime)
      );
    });
  };

  // Rezervasyonu güncelleme fonksiyonu - Geliştirilmiş güvenlik ve doğruluk
  const updateReservation = (updatedReservation: ReservationType) => {
    try {
      console.log("Rezervasyonu güncelleme başladı:", updatedReservation);

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

      if (isNewReservation) {
        // Yeni rezervasyon eklendiğinde
        console.log("Yeni rezervasyon ekleniyor...");

        // Müşteri adı kontrolü
        if (!updatedReservation.customerName.trim()) {
          toast.error("Lütfen müşteri adını giriniz.");
          return;
        }

        // Yeni ID oluştur
        const newId = `res-${Date.now()}`;

        // Yeni rezervasyon objesi
        const newReservation = {
          ...updatedReservation,
          id: newId,
        };

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

        // Rezervasyonları güncelle
        const updatedReservations = [...reservations, newReservation];
        setReservations(updatedReservations);

        // localStorage'a kaydet
        localStorage.setItem(
          "reservations",
          JSON.stringify(updatedReservations)
        );

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

        // Rezervasyonları güncelle
        const updatedReservations = reservations.map((res) => {
          if (res.id === updatedReservation.id) {
            return updatedReservation;
          }
          return res;
        });

        setReservations(updatedReservations);

        // localStorage'a kaydet
        localStorage.setItem(
          "reservations",
          JSON.stringify(updatedReservations)
        );

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
  const deleteReservation = (reservationId: string) => {
    try {
      console.log("Rezervasyon silme başladı:", reservationId);

      // Kullanıcıdan onay al
      const userConfirm = window.confirm(
        "Bu rezervasyonu kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
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

      // Rezervasyonu filtrele
      const updatedReservations = reservations.filter(
        (res) => res.id !== reservationId
      );

      setReservations(updatedReservations);

      // localStorage'a kaydet
      localStorage.setItem("reservations", JSON.stringify(updatedReservations));

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
  };

  const goToPreviousDay = () => {
    const prevDay = subDays(selectedDate, 1);
    setSelectedDate(prevDay);
    // Tarih değişikliğinde rezervasyonları filtrele
    filterReservationsByDate(prevDay);
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
    }
  };

  // Tarihe göre rezervasyonları filtrele
  const filterReservationsByDate = (date: Date) => {
    const formattedDate = format(date, "yyyy-MM-dd");

    try {
      // Tüm rezervasyonları burada saklıyoruz
      const allReservations = JSON.parse(
        localStorage.getItem("reservations") || "[]"
      );

      // Seçilen tarihe göre filtreleme yap
      const filteredReservations = allReservations.filter(
        (reservation: ReservationType) => {
          // Rezervasyon tarihini al (startTime içindeki tarih kısmı)
          const reservationDate = reservation.startTime?.split(" ")[0]; // "yyyy-MM-dd" formatında olduğunu varsayıyoruz
          return reservationDate === formattedDate;
        }
      );

      console.log(
        `${formattedDate} tarihli rezervasyonlar:`,
        filteredReservations
      );

      // Filtrelenmiş rezervasyonları güncelle
      setReservations(filteredReservations);

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

    // Mevcut pozisyonu güncelle
    const offsetX = data.x;
    const offsetY = data.y;

    // Elementin altındaki masa ID'sini bul
    // Daha güvenilir bir yöntem kullanıyoruz: document.elementsFromPoint
    const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);

    // Debug için tüm bulunan elementleri loglayalım
    console.log(
      "Bulunan elementler (admin):",
      elementsAtPoint.map((el) => ({
        tag: el.tagName,
        className: el.className,
        dataTableId: el.getAttribute("data-table-id"),
        dataHour: el.getAttribute("data-hour"),
      }))
    );

    // Masa ID'sini bulmaya çalışalım
    let foundTableId = false;

    // 1. Yöntem: Doğrudan data-table-id özniteliği olan elementi bul
    for (const element of elementsAtPoint) {
      const tableId = element.getAttribute("data-table-id");
      if (tableId) {
        console.log(
          "Bulundu! tableId:",
          tableId,
          "element:",
          element.tagName,
          element.className
        );
        draggedReservation.tableId = tableId;
        foundTableId = true;
        break;
      }
    }

    // 2. Yöntem: Eğer bulunamadıysa, bir üst veya parent elementi kontrol et
    if (!foundTableId) {
      for (const element of elementsAtPoint) {
        const parent = element.parentElement;
        if (parent) {
          const parentTableId = parent.getAttribute("data-table-id");
          if (parentTableId) {
            console.log("Parent'ta bulundu! tableId:", parentTableId);
            draggedReservation.tableId = parentTableId;
            foundTableId = true;
            break;
          }
        }
      }
    }

    // 3. Yöntem: table-row sınıfına sahip elementleri dene
    if (!foundTableId) {
      for (const element of elementsAtPoint) {
        if (element.classList && element.classList.contains("table-row")) {
          const closestWithTableId = element.closest("[data-table-id]");
          if (closestWithTableId) {
            const tableRowId = closestWithTableId.getAttribute("data-table-id");
            if (tableRowId) {
              console.log("table-row üzerinden bulundu! tableId:", tableRowId);
              draggedReservation.tableId = tableRowId;
              foundTableId = true;
              break;
            }
          }
        }
      }
    }

    // Zaman hesaplama - sürükleme mesafesine göre zaman güncelleme
    const cellWidthMinutes = 60;
    const minuteOffset = Math.round((offsetX / cellWidth) * cellWidthMinutes);

    // Yeni başlangıç ve bitiş zamanlarını hesapla (taşıma sırasında süre aynı kalır)
    const startMinutes = convertTimeToMinutes(initialStartTime);
    const endMinutes = convertTimeToMinutes(initialEndTime);
    const duration = endMinutes - startMinutes;

    const newStartMinutes = startMinutes + minuteOffset;
    const newEndMinutes = newStartMinutes + duration;

    // Yeni zamanları ayarla
    draggedReservation.startTime = convertMinutesToTime(newStartMinutes);
    draggedReservation.endTime = convertMinutesToTime(newEndMinutes);

    // Güncellenmiş pozisyonu göster
    // Not: Burada render trigger etmek için state'i güncelliyoruz
    setDraggedReservation({ ...draggedReservation });

    // Masa değişimini loglayalım
    if (foundTableId && draggedReservation.tableId !== initialTableId) {
      console.log(
        `Masa değişiyor (admin): ${initialTableId} -> ${draggedReservation.tableId}`
      );
    }
  };

  // Sürükleme tamamlandığında çağrılacak fonksiyon
  const handleDragStop = (e: any, ui: { x: number; y: number }) => {
    if (!draggedReservation) {
      setIsDragging(false);
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

    const { size } = data;
    const cellWidthMinutes = 60;

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
      const minutesDiff = Math.round(
        (widthDiff / cellWidth) * cellWidthMinutes
      );

      // Bitiş zamanını güncelle
      const endMinutes = convertTimeToMinutes(draggedReservation.endTime);
      const newEndMinutes = endMinutes + minutesDiff;
      const startMinutes = convertTimeToMinutes(draggedReservation.startTime);

      // Minimum süre kontrolü (15 dakika)
      if (newEndMinutes - startMinutes >= 15) {
        draggedReservation.endTime = convertMinutesToTime(newEndMinutes);
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
      const minutesDiff = Math.round(
        (positionDiff / cellWidth) * cellWidthMinutes
      );

      // Başlangıç zamanını güncelle
      const startMinutes = convertTimeToMinutes(initialStartTime);
      const newStartMinutes = startMinutes + minutesDiff;
      const endMinutes = convertTimeToMinutes(draggedReservation.endTime);

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

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 text-gray-800">
      {/* Aktif rezervasyon bildirimleri */}
      <ActiveReservations />

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
            className="flex-1 overflow-auto hide-scrollbar relative"
            ref={gridContainerRef}
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
                {currentTimePosition !== null && (
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
                          className="flex-shrink-0 flex items-center px-4 border-r border-gray-200 sticky left-0 z-10"
                          style={{
                            width: `${CATEGORY_WIDTH}px`,
                            height: `${cellHeight}px`,
                            backgroundColor:
                              category.backgroundColor || "#f9fafb",
                          }}
                        >
                          <div
                            className="w-2 h-2 rounded-full mr-2"
                            style={{ backgroundColor: category.borderColor }}
                          ></div>
                          <span className="text-sm font-medium mr-2">
                            {table.number}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center">
                            <FiUsers className="mr-1" />
                            {table.capacity}
                          </span>
                        </div>

                        {/* Saat hücreleri */}
                        <div className="flex flex-1 relative">
                          {hours.map((hour) => (
                            <div
                              key={`${table.id}-${hour}`}
                              className="border-r border-gray-200 relative cursor-pointer hover:bg-blue-50 table-row"
                              style={{
                                width: `${cellWidth}px`,
                                height: `${cellHeight}px`,
                                backgroundColor:
                                  hour === currentTime.substring(0, 5)
                                    ? "rgba(255, 255, 255, 0.5)"
                                    : "white",
                              }}
                              data-hour={hour}
                              data-table={table.number}
                              data-table-id={table.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                const clickedHour =
                                  e.currentTarget.getAttribute("data-hour");
                                const clickedTableId =
                                  e.currentTarget.getAttribute("data-table-id");
                                if (clickedHour && clickedTableId) {
                                  handleEmptyCellClick(
                                    clickedTableId,
                                    clickedHour
                                  );
                                } else {
                                  toast.error("Hücre bilgileri alınamadı!");
                                }
                              }}
                            ></div>
                          ))}
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
                                  key={reservation.id}
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
                                />
                              );
                            })}
                        </div>
                      </div>
                    ))}
                </div>
              ))}

              {/* Güncel saat çizgisi - Ana tablo alanında */}
              {currentTimePosition !== null && (
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
              <h2 className="text-lg font-semibold">Rezervasyon Detayları</h2>
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
                      className="w-full p-2 border border-gray-300 rounded mt-1"
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
                      className="w-full p-2 border border-gray-300 rounded mt-1"
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
                      className="w-full p-2 border border-gray-300 rounded"
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

                    {/* Hızlı masa değiştirme butonları */}
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {tableCategories.map((category) => {
                        // Her kategoriden kapasiteye göre masaları göster
                        const smallTable = tables.find(
                          (t) => t.categoryId === category.id && t.capacity <= 2
                        );
                        const mediumTable = tables.find(
                          (t) =>
                            t.categoryId === category.id &&
                            t.capacity >= 3 &&
                            t.capacity <= 4
                        );
                        const largeTable = tables.find(
                          (t) => t.categoryId === category.id && t.capacity >= 6
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
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-600">
                        Başlangıç Saati
                      </label>
                      <input
                        type="time"
                        value={selectedReservation.startTime}
                        onChange={(e) => {
                          const newStartTime = e.target.value;
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

                          setSelectedReservation({
                            ...selectedReservation,
                            startTime: newStartTime,
                            endTime: endTime,
                          });
                        }}
                        className="w-full p-2 border border-gray-300 rounded mt-1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600">
                        Bitiş Saati
                      </label>
                      <input
                        type="time"
                        value={selectedReservation.endTime}
                        onChange={(e) =>
                          setSelectedReservation({
                            ...selectedReservation,
                            endTime: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-gray-300 rounded mt-1"
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
                      className="w-full p-2 border border-gray-300 rounded mt-1"
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
                      className="w-full p-2 border border-gray-300 rounded mt-1 h-20"
                      placeholder="Özel istekler, notlar..."
                    ></textarea>
                  </div>
                </div>
              </div>

              {/* Garson Ataması */}
              <div>
                <h3 className="text-md font-medium mb-2">Garson Ataması</h3>
                <div className="space-y-3">
                  <div className="max-h-40 overflow-y-auto border border-gray-300 rounded p-2">
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
                <div className="flex space-x-2">
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
                      onClick={() =>
                        setSelectedReservation({
                          ...selectedReservation,
                          color,
                        })
                      }
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

              {/* Tehlikeli İşlemler */}
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
    </div>
  );
}
