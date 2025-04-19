"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useRef, useMemo } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { BiSearch, BiArrowToRight, BiArrowToLeft } from "react-icons/bi";
import { IoMdRefresh } from "react-icons/io";
import { HiOutlineDotsVertical } from "react-icons/hi";
import { FiChevronDown, FiUsers } from "react-icons/fi";
import Link from "next/link";
import toast from "react-hot-toast";

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

// Asıl içerik - Window ve tarayıcı API'larını kullanabilir
function AdminPageComponent() {
  const currentDate = new Date();
  const [currentTime, setCurrentTime] = useState(format(new Date(), "HH:mm"));
  const [currentTimePosition, setCurrentTimePosition] = useState<number | null>(
    null
  );
  const mainContentRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

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

  // CELL_WIDTH ve CATEGORY_WIDTH sabitlerini tanımla
  const CELL_WIDTH = 160; // Saat hücresi genişliği
  const CATEGORY_WIDTH = 140; // Kategori kolonu genişliği

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
      const position = hourIndex * CELL_WIDTH + (minutePart / 60) * CELL_WIDTH;

      // Sayfanın ortasına scroll etmek için
      if (gridContainerRef.current) {
        // İlk yükleme için bir kerelik yapıyoruz
        setTimeout(() => {
          const screenWidth = window.innerWidth;
          const scrollPosition =
            CATEGORY_WIDTH + position - screenWidth / 2 + CELL_WIDTH / 2;

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
    return () => clearInterval(timer);
  }, [CELL_WIDTH]);

  // Mevcut rezervasyonlar
  const [reservations, setReservations] = useState<ReservationType[]>([
    {
      id: "res-1",
      tableId: "t1",
      customerName: "Ahmet Yılmaz",
      guestCount: 4,
      startTime: "12:00",
      endTime: "13:00",
      status: "confirmed",
      note: "Doğum günü kutlaması",
      staffIds: ["s1", "s2"],
    },
    {
      id: "res-2",
      tableId: "t3",
      customerName: "Mehmet Demir",
      guestCount: 2,
      startTime: "13:30",
      endTime: "15:30",
      status: "confirmed",
      staffIds: ["s2"],
    },
    {
      id: "res-3",
      tableId: "b2",
      customerName: "Ayşe Kaya",
      guestCount: 6,
      startTime: "19:00",
      endTime: "21:30",
      status: "confirmed",
      staffIds: ["s1", "s3"],
    },
    {
      id: "res-4",
      tableId: "i1",
      customerName: "Fatma Şahin",
      guestCount: 3,
      startTime: "20:00",
      endTime: "22:00",
      status: "confirmed",
    },
    {
      id: "res-5",
      tableId: "b4",
      customerName: "Ali Yıldız",
      guestCount: 5,
      startTime: "18:00",
      endTime: "20:00",
      status: "pending",
    },
    {
      id: "res-6",
      tableId: "i3",
      customerName: "Zeynep Çelik",
      guestCount: 2,
      startTime: "12:30",
      endTime: "14:30",
      status: "confirmed",
    },
    {
      id: "res-7",
      tableId: "t5",
      customerName: "Mustafa Kara",
      guestCount: 4,
      startTime: "13:00",
      endTime: "15:00",
      status: "confirmed",
    },
    {
      id: "res-8",
      tableId: "t1",
      customerName: "Elif Arslan",
      guestCount: 8,
      startTime: "20:30",
      endTime: "23:00",
      status: "confirmed",
    },
    {
      id: "res-9",
      tableId: "b3",
      customerName: "Hüseyin Öztürk",
      guestCount: 7,
      startTime: "21:00",
      endTime: "23:30",
      status: "pending",
    },
    {
      id: "res-10",
      tableId: "i4",
      customerName: "Seda Aydın",
      guestCount: 4,
      startTime: "19:30",
      endTime: "21:30",
      status: "confirmed",
    },
    // Sabah erken saatler için rezervasyon
    {
      id: "res-11",
      tableId: "t4",
      customerName: "Kemal Yıldırım",
      guestCount: 3,
      startTime: "07:00",
      endTime: "08:30",
      status: "confirmed",
    },
    // Gece yarısından sonrası için rezervasyon
    {
      id: "res-12",
      tableId: "b1",
      customerName: "Canan Aksoy",
      guestCount: 2,
      startTime: "00:30",
      endTime: "01:45",
      status: "confirmed",
    },
    // Gece geç saatlerden ertesi güne uzanan rezervasyon
    {
      id: "res-13",
      tableId: "i2",
      customerName: "Oğuz Keskin",
      guestCount: 6,
      startTime: "22:00",
      endTime: "01:00",
      status: "confirmed",
    },
  ]);

  // Masaları kategorilerine göre tanımla
  const tables = useMemo<TableType[]>(
    () => [
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
    ],
    []
  );

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

    // Zamanın hangi hücrede olduğunu bul
    const hourPart = parseInt(currentTime.split(":")[0]);
    const minutePart = parseInt(currentTime.split(":")[1]);

    // Geçerli saati bul (7'den başlayarak)
    let hourIndex = -1;

    if (hourPart >= 7 && hourPart <= 24) {
      hourIndex = hourPart - 7;
    } else if (hourPart >= 1 && hourPart <= 2) {
      hourIndex = 24 - 7 + hourPart; // 01:00 ve 02:00 için
    }

    if (hourIndex >= 0) {
      // Saat ve dakikaya göre pozisyonu hesapla
      const position = hourIndex * CELL_WIDTH + (minutePart / 60) * CELL_WIDTH;
      setCurrentTimePosition(position);
      console.log("Zaman pozisyonu hesaplandı:", position, "px");

      // Sayfanın ortasına scroll etmek için
      if (gridContainerRef.current) {
        // Ekranın ortasına konumlandırmak için ekran genişliğini hesapla
        const screenWidth = window.innerWidth;
        // Zaman çizgisinin pozisyonu + kategori genişliği - ekranın yarısı
        const scrollPosition =
          CATEGORY_WIDTH + position - screenWidth / 2 + CELL_WIDTH / 2;

        // Scroll pozisyonunu ayarla (animasyonlu olarak)
        setTimeout(() => {
          gridContainerRef.current?.scrollTo({
            left: Math.max(0, scrollPosition),
            behavior: "smooth",
          });
        }, 500); // Sayfa yüklendikten sonra scroll işlemini yapmak için kısa bir gecikme
      }
    } else {
      setCurrentTimePosition(null);
      console.log("Geçerli saat aralığı dışında, çizgi gösterilmeyecek");
    }

    // Her saniye güncelleme için bir zamanlayıcı ekleyelim
    const timer = setInterval(() => {
      const now = new Date();
      const formattedTime = format(now, "HH:mm");
      setCurrentTime(formattedTime);
    }, 60000); // Her dakika güncelle

    return () => clearInterval(timer);
  }, [currentTime, CELL_WIDTH]);

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

    const handleResize = () => {
      // Burada pencere boyutu değiştiğinde yapılacak işlemler
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
        startColumnIndex * CELL_WIDTH + (startMinute / 60) * CELL_WIDTH;

      // Genişlik hesabı
      let width;

      if (endColumnIndex >= startColumnIndex) {
        // Normal durum - aynı gün içinde biten rezervasyon
        const columnSpan = endColumnIndex - startColumnIndex;
        width =
          columnSpan * CELL_WIDTH +
          (endMinute / 60) * CELL_WIDTH -
          (startMinute / 60) * CELL_WIDTH;
      } else {
        // Gece yarısını geçen durumlar
        const columnSpan = hours.length - startColumnIndex + endColumnIndex;
        width =
          columnSpan * CELL_WIDTH +
          (endMinute / 60) * CELL_WIDTH -
          (startMinute / 60) * CELL_WIDTH;
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
    // LocalStorage'dan garson verilerini yükle
    const savedStaff = localStorage.getItem("staff");
    if (savedStaff) {
      try {
        setStaff(JSON.parse(savedStaff));
      } catch (error) {
        console.error("Garson verileri yüklenirken hata oluştu:", error);
      }
    }

    // LocalStorage'dan rezervasyon verilerini yükle
    const savedReservations = localStorage.getItem("reservations");
    if (savedReservations) {
      try {
        setReservations(JSON.parse(savedReservations));
      } catch (error) {
        console.error("Rezervasyon verileri yüklenirken hata oluştu:", error);
      }
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

  // Socket.IO bağlantısı için
  useEffect(() => {
    // SSR/SSG sırasında çalıştırma
    if (typeof window === "undefined") return;

    // Gerçek zamanlı müşteri rezervasyon bildirimleri
    const setupReservationConflictNotifications = () => {
      // Rastgele bildirimlerden kurtulup, sadece admin ve müşteri aynı masa ve zamanı seçtiğinde bildirim gösterelim
      const checkForConflicts = () => {
        if (
          !isRightSidebarOpen ||
          !selectedReservation?.tableId ||
          !selectedReservation?.startTime ||
          !selectedReservation?.endTime
        ) {
          return; // Sidebar açık değilse veya seçili rezervasyon yoksa kontrol etme
        }

        // Admin tarafından seçilen masa ve zaman
        const adminSelectedTableId = selectedReservation.tableId;
        const adminStartTime = selectedReservation.startTime;
        const adminEndTime = selectedReservation.endTime;

        // Aktif müşteri formları için kontrol et
        // Gerçek senaryoda bu WebSocket ile güncellenecek
        // Şimdilik demo amaçlı müşteri aktivitesini temsil ediyoruz
        const customerNames = [
          "Ahmet Yılmaz",
          "Mehmet Kaya",
          "Ayşe Demir",
          "Fatma Şahin",
          "Zeynep Çelik",
        ];

        // Zaman çakışması olup olmadığını kontrol ediyoruz
        const isMasaVeZamanCakismasi = (
          formTableId: string,
          formStartTime: string,
          formEndTime: string
        ) => {
          if (formTableId !== adminSelectedTableId) return false;

          const adminStart = new Date(adminStartTime).getTime();
          const adminEnd = new Date(adminEndTime).getTime();
          const formStart = new Date(formStartTime).getTime();
          const formEnd = new Date(formEndTime).getTime();

          return formStart < adminEnd && formEnd > adminStart;
        };

        // Yeni aktif form var mı diye kontrol et
        // 5 dakikadan eski olanları gösterme
        const fiveMinutesAgo = new Date();
        fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

        // Gerçek bir sistemde burası WebSocket ile güncellenecek
        // Şimdilik demo için %15 ihtimalle yeni müşteri formu oluşturuyoruz
        if (Math.random() < 0.15) {
          const randomIndex = Math.floor(Math.random() * customerNames.length);
          const customerName = customerNames[randomIndex];

          // Tablo ve zaman bilgisini admin'in seçimiyle aynı yap
          // Burada gerçek senaryoda müşterinin gerçekten seçtiği masa kullanılacak
          const randomTableId =
            Math.random() < 0.7
              ? adminSelectedTableId
              : `table-${Math.floor(Math.random() * 10) + 1}`;

          // Rastgele başlangıç saati (şimdi veya 1-2 saat sonrası)
          const now = new Date();
          const hours = now.getHours() + Math.floor(Math.random() * 3);
          const minutes = Math.floor(Math.random() * 60);
          const formStartTime = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            hours,
            minutes
          ).toISOString();

          // Bitiş saati (başlangıç + 1-2 saat)
          const formEndDate = new Date(formStartTime);
          formEndDate.setHours(
            formEndDate.getHours() + 1 + Math.floor(Math.random() * 2)
          );
          const formEndTime = formEndDate.toISOString();

          // Çakışma kontrolü
          const isConflict = isMasaVeZamanCakismasi(
            randomTableId,
            formStartTime,
            formEndTime
          );

          // Sadece çakışma varsa bildirim göster
          if (isConflict) {
            const newForm = {
              id: `form-${Date.now()}`,
              customerName,
              tableId: randomTableId,
              startTime: formStartTime,
              endTime: formEndTime,
              guestCount: Math.floor(Math.random() * 8) + 1,
              lastActivity: new Date(),
              status: Math.random() < 0.7 ? "selecting_table" : "filling_form",
              isConflict: true,
            } as ActiveFormType;

            // Dikkat çekici bildirim oluştur
            toast.error(
              `Müşteri "${customerName}" şu anda sizinle aynı masa ve saati seçmeye çalışıyor! Masa: ${randomTableId}, Saat: ${new Date(
                formStartTime
              ).toLocaleTimeString("tr-TR")}`,
              { duration: 10000 }
            );

            // Aktif formları güncelle
            setActiveForms((prev) => [...prev, newForm]);
          }
        }

        // Her 10-30 saniyede bir kontrol et
        const randomDelay = 10000 + Math.floor(Math.random() * 20000);
        setTimeout(checkForConflicts, randomDelay);
      };

      // İlk kontrol
      checkForConflicts();
    };

    // Bildirim sistemini başlat
    const cleanup = setupReservationConflictNotifications();
    return cleanup;
  }, [isRightSidebarOpen, selectedReservation, activeForms]);

  // Ana içeriğe başlamadan önce aktif rezervasyonları göster
  const ActiveReservations = () => {
    if (activeForms.length === 0) return null;

    return (
      <div className="fixed right-4 top-4 z-50 space-y-3 pointer-events-none">
        {activeForms.map((form, index) => {
          // Çakışma durumuna göre stil belirle
          const isConflict = form.isConflict;
          const borderColor = isConflict
            ? "#ef4444" // Kırmızı (çakışma)
            : form.status === "filling_form"
            ? "#3B82F6" // Mavi
            : form.status === "selecting_table"
            ? "#10B981" // Yeşil
            : "#F59E0B"; // Turuncu

          return (
            <div
              key={form.id}
              className="bg-white rounded-lg shadow-lg p-4 w-72 pointer-events-auto animate-slideInRight"
              style={{
                animationDelay: `${index * 0.2}s`,
                borderLeft: `4px solid ${borderColor}`,
              }}
            >
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-medium text-gray-800">
                  {form.customerName || "Yeni Müşteri"}
                </h4>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    isConflict
                      ? "bg-red-100 text-red-800"
                      : form.status === "filling_form"
                      ? "bg-blue-100 text-blue-800"
                      : form.status === "selecting_table"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {isConflict
                    ? "Çakışma"
                    : form.status === "filling_form"
                    ? "Form Dolduruyor"
                    : form.status === "selecting_table"
                    ? "Masa Seçiyor"
                    : "Tamamlanıyor"}
                </span>
              </div>
              <div className="text-gray-600 text-sm">
                <div className="flex justify-between mb-1">
                  <span>Saat:</span>
                  <span>{form.startTime || "Henüz seçilmedi"}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>Kişi:</span>
                  <span>{form.guestCount || "?"}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>Masa:</span>
                  <span>
                    {tables.find((t) => t.id === form.tableId)?.number || "-"}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Son aktivite:</span>
                  <span>
                    {form.lastActivity
                      ? new Date(form.lastActivity).toLocaleTimeString()
                      : "-"}
                  </span>
                </div>
                {isConflict && (
                  <div className="mt-2 p-2 bg-red-50 text-xs text-red-800 rounded">
                    <strong>Uyarı:</strong> Bu müşteri sizin şu anda
                    düzenlediğiniz masa ve saat için işlem yapıyor!
                  </div>
                )}
              </div>

              <div className="mt-3 flex justify-end space-x-2">
                <button
                  onClick={() => {
                    // Tıklanan müşterinin rezervasyon bilgilerini göster
                    const tableInfo = tables.find((t) => t.id === form.tableId);
                    const categoryInfo = tableCategories.find(
                      (c) => c.id === tableInfo?.categoryId
                    );

                    if (isConflict) {
                      // Çakışma bildirimi için özel işlem
                      toast.error(
                        `DİKKAT! Çakışma: ${form.customerName} - Masa ${
                          tableInfo?.number || "?"
                        } - ${form.startTime}`,
                        { duration: 5000 }
                      );
                    } else {
                      // Normal bildirim
                      toast.success(
                        `${form.customerName}: Masa ${
                          tableInfo?.number || "?"
                        } (${categoryInfo?.name || "?"}) - ${form.startTime}`,
                        { duration: 5000 }
                      );
                    }
                  }}
                  className={`text-xs px-2 py-1 ${
                    isConflict
                      ? "bg-red-100 hover:bg-red-200 text-red-700"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  } rounded`}
                >
                  {isConflict ? "İncele" : "Görüntüle"}
                </button>
                <button
                  onClick={() => {
                    // Bu bildirimi listeden kaldır
                    setActiveForms((prev) =>
                      prev.filter((f) => f.id !== form.id)
                    );
                    toast.success("Bildirim kapatıldı");
                  }}
                  className="text-xs px-2 py-1 bg-red-50 hover:bg-red-100 rounded text-red-700"
                >
                  Kapat
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
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
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <span>Today</span>
          </button>
          <div className="flex items-center space-x-2">
            <button className="p-2 rounded-lg hover:bg-gray-100">
              <BiArrowToLeft className="text-xl text-gray-600" />
            </button>
            <span className="font-medium text-lg">
              {format(currentDate, "dd MMMM yyyy", { locale: tr })}
            </span>
            <button className="p-2 rounded-lg hover:bg-gray-100">
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
            <div
              className="relative"
              style={{
                width: `${CATEGORY_WIDTH + hours.length * CELL_WIDTH}px`,
                minWidth: "100%",
              }}
            >
              {/* Saatler başlık satırı - Sticky */}
              <div className="sticky top-0 z-20 flex bg-white border-b border-gray-200">
                {/* Kategoriler için boş alan */}
                <div
                  className="flex-shrink-0 h-14 bg-white border-r border-gray-200 sticky left-0 z-30"
                  style={{ width: `${CATEGORY_WIDTH}px` }}
                ></div>

                {/* Saat başlıkları */}
                <div className="flex flex-1">
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="border-r border-gray-200 h-14 flex flex-col justify-center items-center"
                      style={{ width: `${CELL_WIDTH}px` }}
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
              </div>

              {/* Kategori isimleri yan tarafta */}
              {tableCategories.map((category) => (
                <div key={category.id}>
                  <div className="flex">
                    {/* Kategori adı sol tarafta */}
                    <div
                      className="flex-shrink-0 h-14 flex items-center px-4 border-b border-r font-semibold text-gray-600 text-sm sticky left-0 z-10"
                      style={{
                        width: `${CATEGORY_WIDTH}px`,
                        borderColor: category.borderColor,
                        borderBottomWidth: "2px",
                        backgroundColor: getLighterColor(category.color),
                      }}
                    >
                      {category.name}
                    </div>

                    {/* Saat çizelgesinde kategori başlığı için boş alan */}
                    <div
                      className="flex-1 h-14 border-b"
                      style={{
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
                        className="flex relative h-14 border-t border-gray-200"
                      >
                        {/* Masa bilgisi sol tarafta - sticky yapıyoruz */}
                        <div
                          className="flex-shrink-0 h-14 flex items-center px-4 border-r border-gray-200 sticky left-0 z-10"
                          style={{
                            width: `${CATEGORY_WIDTH}px`,
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
                              className="border-r border-gray-200 h-14 relative cursor-pointer hover:bg-blue-50"
                              style={{
                                width: `${CELL_WIDTH}px`,
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
                          }}
                        >
                          {/* Debug çizgileri - saatleri görsel olarak göstermek için */}
                          {hours.map((hour, idx) => (
                            <div
                              key={`debug-line-${hour}`}
                              className="absolute top-0 h-full border-l border-blue-200 opacity-0 hover:opacity-30"
                              style={{
                                left: `${idx * CELL_WIDTH}px`,
                                width: "1px",
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
                                <div
                                  key={reservation.id}
                                  id={`reservation-${reservation.id}`}
                                  className="absolute rounded-md cursor-pointer pointer-events-auto flex items-center overflow-visible shadow-md hover:shadow-lg transition-all duration-200"
                                  style={{
                                    left: `calc(${position.left} + 1px)`,
                                    width: `calc(${position.width} - 2px)`,
                                    top: "1px", // Üstten 1px boşluk
                                    height: "calc(100% - 2px)", // Alt ve üst toplam 2px boşluk
                                    backgroundColor:
                                      reservation.color || category.color,
                                    borderLeft: `4px solid ${category.borderColor}`,
                                    minWidth: "80px",
                                    zIndex: 5,
                                    borderRadius: "4px",
                                  }}
                                  data-reservation-id={reservation.id}
                                  data-table-id={reservation.tableId}
                                  data-time={`${reservation.startTime}-${reservation.endTime}`}
                                  onMouseEnter={() => {
                                    handleReservationHover(reservation);
                                  }}
                                  onMouseLeave={handleReservationLeave}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReservationClick(reservation);
                                    setSidebarClicked(true);
                                    setSidebarOpenedByHover(false);
                                  }}
                                >
                                  {/* Sol tutamaç */}
                                  <div className="absolute left-0 top-0 h-full w-2 cursor-ew-resize opacity-0 hover:opacity-100 bg-white bg-opacity-20"></div>

                                  <div className="px-3 py-0 text-xs truncate max-w-full text-white h-full flex flex-col justify-center">
                                    <div className="font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
                                      {reservation.customerName}
                                    </div>
                                    <div className="text-white text-opacity-95 text-[11px] flex items-center mt-1">
                                      <span className="mr-1">
                                        {reservation.startTime}-
                                        {reservation.endTime}
                                      </span>
                                      <span className="bg-white bg-opacity-30 px-1 rounded text-[10px]">
                                        {reservation.guestCount} kişi
                                      </span>
                                    </div>
                                  </div>

                                  {/* Sağ tutamaç */}
                                  <div className="absolute right-0 top-0 h-full w-2 cursor-ew-resize opacity-0 hover:opacity-100 bg-white bg-opacity-20"></div>
                                </div>
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
                  className="absolute border-l-2 border-red-500 z-30 group hover:cursor-pointer transition-all duration-300"
                  style={{
                    left: `${CATEGORY_WIDTH + currentTimePosition}px`,
                    top: "0",
                    height: "100%",
                    pointerEvents: "auto",
                  }}
                >
                  <div className="absolute left-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap">
                    {currentTime}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Bölümü */}
          <div className="h-[60px] bg-white border-t border-gray-200 flex items-center px-4 text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded bg-blue-600 mr-2"></div>
                <span>Onaylanmış Rezervasyon</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded bg-blue-600 mr-2 opacity-70"></div>
                <span>Bekleyen Rezervasyon</span>
              </div>
              <div className="ml-auto">
                Toplam Misafir: {totalGuestCount} kişi
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
