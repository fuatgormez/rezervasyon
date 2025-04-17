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
        icon: "👋",
        duration: 5000,
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

  // Rezervasyon pozisyonunu hesapla - En doğru hizalama için yeniden düzenlendi
  const getReservationPosition = (
    startTime: string,
    endTime: string
  ): { left: string; width: string } => {
    try {
      // Zamanları parçala
      const [startHourStr, startMinuteStr] = startTime.split(":");
      const [endHourStr, endMinuteStr] = endTime.split(":");

      // Sayıya çevir
      const startHour = parseInt(startHourStr);
      const startMinute = parseInt(startMinuteStr);
      const endHour = parseInt(endHourStr);
      const endMinute = parseInt(endMinuteStr);

      // Saat indekslerini hesapla (7:00 = 0 indeksi)
      let startIndex = 0;
      if (startHour >= 7 && startHour <= 24) {
        startIndex = startHour - 7; // 7:00 -> 0, 8:00 -> 1 vs.
      } else if (startHour >= 1 && startHour <= 6) {
        startIndex = 24 - 7 + startHour; // 1:00 -> 18, 2:00 -> 19 vs.
      }

      let endIndex = 0;
      if (endHour >= 7 && endHour <= 24) {
        endIndex = endHour - 7;
      } else if (endHour >= 1 && endHour <= 6) {
        endIndex = 24 - 7 + endHour;
      }

      // Gece yarısını aşan rezervasyonlar için özel kontrol
      if (endHour < startHour && endHour >= 0 && endHour <= 6) {
        // örn. 23:00-01:00 durumu
        endIndex = 24 - 7 + endHour;
      }

      // Dakika oranlarını normalize et (0-1 arası)
      const startFraction = startMinute / 60.0;
      const endFraction = endMinute / 60.0;

      // Başlangıç pozisyonunu hücre genişliğine göre hesapla
      const leftPos = (startIndex + startFraction) * CELL_WIDTH;

      // Genişliği hesapla
      let width = 0;

      if (
        endIndex > startIndex ||
        (endIndex === startIndex && endMinute >= startMinute)
      ) {
        // Normal durum: aynı gün içinde ya da aynı saatte başlayıp biten
        const duration = endIndex - startIndex + (endFraction - startFraction);
        width = duration * CELL_WIDTH;
      } else {
        // Günü aşan rezervasyon: gece yarısından sonraya taşan
        // Örn: 23:30 - 01:45 durumu
        const hoursUntilMidnight = 24 - startHour - startFraction;
        const hoursAfterMidnight = endHour + endFraction;
        width = (hoursUntilMidnight + hoursAfterMidnight) * CELL_WIDTH;
      }

      // Debug bilgisi
      console.log(`
        Rezervasyon Pozisyonu:
        Zaman: ${startTime}-${endTime}
        Başlangıç: ${startIndex}:${startMinute} (${startFraction.toFixed(2)})
        Bitiş: ${endIndex}:${endMinute} (${endFraction.toFixed(2)})
        Pozisyon: left=${leftPos.toFixed(1)}px, width=${width.toFixed(1)}px
      `);

      return {
        left: `${leftPos}px`,
        width: `${Math.max(width, 80)}px`, // Minimum 80px genişlik
      };
    } catch (error) {
      console.error("Rezervasyon pozisyonu hesaplanırken hata:", error);
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

  // Tüm hover işlemleri için global bir state ekleyelim
  const [hoveredReservationId, setHoveredReservationId] = useState<
    string | null
  >(null);

  // Rezervasyon hover durumunda
  const handleReservationHover = (reservation: ReservationType) => {
    // Hover edilen rezervasyon ID'sini güncelle
    setHoveredReservationId(reservation.id);

    // Eğer bir zamanlayıcı varsa temizleyelim
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    // Hover durumunda daima seçili rezervasyonu güncelle
    setSelectedReservation(reservation);

    // Sidebar kapalıysa aç
    if (!isRightSidebarOpen) {
      setIsRightSidebarOpen(true);
      setSidebarOpenedByHover(true);
    } else {
      // Sidebar açıksa ve hover ile açıldıysa, hover durumunu koru
      if (sidebarOpenedByHover) {
        setSidebarOpenedByHover(true);
      }
    }
  };

  // Hover durumu bittiğinde - reservationId parametresini kullanıyoruz
  const handleReservationLeave = (reservationId: string) => {
    // Eğer parametrenin ID'si, şu anki hover id'si ile aynıysa temizle
    if (hoveredReservationId === reservationId) {
      setHoveredReservationId(null);
    }

    // Eğer sidebar hover ile açıldıysa, kapanma için gecikme ekle
    if (sidebarOpenedByHover && !sidebarClicked) {
      // Varsa önceki zamanlayıcıyı temizle
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }

      // Yeni bir zamanlayıcı oluştur
      hoverTimeoutRef.current = setTimeout(() => {
        // Hâlâ hover durumunda değilse kapat
        if (
          sidebarOpenedByHover &&
          !sidebarClicked &&
          hoveredReservationId === null
        ) {
          setIsRightSidebarOpen(false);
          setSidebarOpenedByHover(false);
        }
        hoverTimeoutRef.current = null;
      }, 700); // Geçiş için daha uzun bir süre ver
    }
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
  const [activeForms, setActiveForms] = useState<
    {
      id: string;
      customerName: string;
      startTime: string;
      tableId?: string;
      guestCount: number;
      lastActivity: Date;
      status: "filling_form" | "selecting_table" | "completing";
    }[]
  >([]);

  // Socket.IO bağlantısı için
  useEffect(() => {
    // SSR/SSG sırasında çalıştırma
    if (typeof window === "undefined") return;

    // Gerçek uygulamada WebSocket bağlantısı burada kurulur
    const setupWebSocket = () => {
      // WebSocket veya Socket.IO bağlantısı örneği:
      // const socket = io();
      // socket.on('reservation:activity', (data) => {
      //   setActiveForms(prev => {
      //     // Eğer zaten aynı ID'ye sahip bir form varsa, onu güncelle
      //     const exists = prev.some(f => f.id === data.sessionId);
      //     if (exists) {
      //       return prev.map(f => f.id === data.sessionId ? { ...f, ...data, lastActivity: new Date() } : f);
      //     }
      //     // Yoksa yeni ekle (en fazla 5 form göster)
      //     return [...prev.slice(-4), { ...data, lastActivity: new Date() }];
      //   });
      // });
      // Temizleme fonksiyonu
      // return () => socket.disconnect();
    };

    setupWebSocket();
  }, []);

  // Ana içeriğe başlamadan önce aktif rezervasyonları göster
  const ActiveReservations = () => {
    if (activeForms.length === 0) return null;

    return (
      <div className="fixed right-4 top-24 z-50 space-y-3 pointer-events-none">
        {activeForms.map((form, index) => (
          <div
            key={form.id}
            className="bg-white rounded-lg shadow-lg p-4 w-72 pointer-events-auto animate-slideInRight"
            style={{
              animationDelay: `${index * 0.2}s`,
              borderLeft: `4px solid ${
                form.status === "filling_form"
                  ? "#3B82F6"
                  : form.status === "selecting_table"
                  ? "#10B981"
                  : "#F59E0B"
              }`,
            }}
          >
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-medium text-gray-800">
                {form.customerName || "Yeni Müşteri"}
              </h4>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  form.status === "filling_form"
                    ? "bg-blue-100 text-blue-800"
                    : form.status === "selecting_table"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {form.status === "filling_form"
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
              <div className="flex justify-between text-xs text-gray-500">
                <span>Son aktivite:</span>
                <span>
                  {form.lastActivity
                    ? new Date(form.lastActivity).toLocaleTimeString()
                    : "-"}
                </span>
              </div>
            </div>

            <div className="mt-3 flex justify-end space-x-2">
              <button
                onClick={() => {
                  // Yeni sekmede ilgili formu aç (gerçek uygulamada)
                  toast.success(
                    `${form.customerName} müşterisinin rezervasyonu görüntüleniyor`
                  );
                }}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
              >
                Görüntüle
              </button>
              <button
                onClick={() => {
                  // Bu müşteriyi listeden kaldır
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
        ))}
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

          if (oldCategory && newCategory && oldCategory.id !== newCategory.id) {
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
      localStorage.setItem("reservations", JSON.stringify(updatedReservations));

      // Tam sayfa yenileme - UI'nin tamamen yeniden oluşturulması için
      // Not: Bu normalde React uygulamalarında önerilmez ancak karmaşık DOM manipülasyonları
      // için bazen gerekli olabilir
      toast.success(
        "Rezervasyon başarıyla güncellendi! Değişiklikler uygulanıyor..."
      );

      setTimeout(() => {
        window.location.reload();
      }, 1000); // 1 saniye bekle, böylece kullanıcı başarı mesajını görebilir
    } catch (error) {
      console.error("Rezervasyon güncellenirken bir hata oluştu:", error);
      toast.error("Rezervasyon güncellenirken beklenmeyen bir hata oluştu.");
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
                      className="flex-shrink-0 h-10 flex items-center px-4 border-b border-r font-semibold text-gray-600 text-sm sticky left-0 z-10"
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
                      className="flex-1 h-10 border-b"
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
                          className="flex-shrink-0 flex items-center px-4 border-r border-gray-200 sticky left-0 z-10"
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
                              className="border-r border-gray-200 h-full relative"
                              style={{
                                width: `${CELL_WIDTH}px`,
                                backgroundColor:
                                  hour === currentTime.substring(0, 5)
                                    ? "rgba(255, 255, 255, 0.5)"
                                    : "white",
                              }}
                              data-hour={hour}
                              data-table={table.number}
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
                                  className="absolute rounded-sm cursor-pointer pointer-events-auto h-10 mt-2 flex items-center overflow-visible"
                                  style={{
                                    left: position.left,
                                    width: position.width,
                                    backgroundColor:
                                      reservation.color || category.color,
                                    borderLeft: `4px solid ${category.borderColor}`,
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
                                    position: "relative",
                                    minWidth: "80px",
                                    zIndex: 5,
                                    transformOrigin: "left center",
                                    transition:
                                      "box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out",
                                  }}
                                  data-reservation-id={reservation.id}
                                  data-table-id={reservation.tableId}
                                  data-time={`${reservation.startTime}-${reservation.endTime}`}
                                  onMouseEnter={() => {
                                    // Hover işlevi ekle
                                    handleReservationHover(reservation);
                                  }}
                                  onMouseLeave={() => {
                                    // Mouse çıkınca kontrol et
                                    handleReservationLeave(reservation.id);
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.boxShadow =
                                      "0 4px 8px rgba(0,0,0,0.25)";
                                    e.currentTarget.style.transform =
                                      "translateY(-1px)";
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.boxShadow =
                                      "0 2px 4px rgba(0,0,0,0.15)";
                                    e.currentTarget.style.transform =
                                      "translateY(0px)";
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReservationClick(reservation);
                                    setSidebarClicked(true); // Tıklandığında sidebar'ı açık tut
                                  }}
                                >
                                  {/* Sol tutamaç */}
                                  <div className="absolute left-0 top-0 h-full w-2 cursor-ew-resize opacity-0 hover:opacity-100 bg-white bg-opacity-20"></div>

                                  <div className="px-3 py-1 text-xs truncate max-w-full text-white">
                                    <div className="font-medium">
                                      {reservation.customerName}
                                    </div>
                                    <div className="text-white text-opacity-90 text-[11px]">
                                      {reservation.guestCount} kişi
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
                        onChange={(e) =>
                          setSelectedReservation({
                            ...selectedReservation,
                            startTime: e.target.value,
                          })
                        }
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
              <div className="border-t border-gray-200 pt-3">
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
      `}</style>

      {/* Tooltip ile ilgili hiçbir şey yok artık */}
    </div>
  );
}
