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
      process.env.NEXT_PUBLIC_NETLIFY_DEPLOYMENT === "true" &&
      process.env.NEXT_PUBLIC_SKIP_SSG_ADMIN === "true" &&
      typeof window === "undefined"
    ) {
      return;
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
  const [reservations] = useState<ReservationType[]>([
    {
      id: "res-1",
      tableId: "t1",
      customerName: "Ahmet Yılmaz",
      guestCount: 4,
      startTime: "12:00",
      endTime: "13:00",
      status: "confirmed",
    },
    {
      id: "res-2",
      tableId: "t3",
      customerName: "Mehmet Demir",
      guestCount: 2,
      startTime: "13:30",
      endTime: "15:30",
      status: "confirmed",
    },
    {
      id: "res-3",
      tableId: "b2",
      customerName: "Ayşe Kaya",
      guestCount: 6,
      startTime: "19:00",
      endTime: "21:30",
      status: "confirmed",
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
      tableId: "t2",
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

  // Rezervasyon pozisyonunu hesapla - Grid hizalama sorunu için düzeltildi
  const getReservationPosition = (
    startTime: string,
    endTime: string
  ): { left: string; width: string } => {
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    // Son saati ayarla (01:00 -> 25, 02:00 -> 26 olarak işle)
    let adjustedEndHour = endHour;
    if (endHour >= 0 && endHour <= 2) {
      adjustedEndHour = endHour + 24;
    }

    // Eğer rezervasyon akşam saatlerinden gece yarısından sonraya kadar sürüyorsa
    if (startHour > endHour && endHour <= 2) {
      adjustedEndHour = endHour + 24;
    }

    // Grid'deki başlangıç saati indeksi (saat 7'den başlıyor)
    const startHourIndex = startHour >= 7 ? startHour - 7 : startHour + 17;

    // Grid'deki bitiş saati indeksi
    const endHourIndex =
      adjustedEndHour >= 7 ? adjustedEndHour - 7 : adjustedEndHour + 17;

    // Sol pozisyonu hesapla (başlangıç saati ve dakikasına göre)
    const startPosition =
      startHourIndex * CELL_WIDTH + (startMinute / 60) * CELL_WIDTH;

    // Genişliği hesapla (bitiş saati ve dakikası ile başlangıç arasındaki fark)
    let width = 0;

    // Toplam saat farkı
    const hourDiff = endHourIndex - startHourIndex;

    // Dakika farkını hesapla
    const minuteDiff = endMinute - startMinute;

    // Toplam genişlik (saat * hücre genişliği + dakika oranı * hücre genişliği)
    width = hourDiff * CELL_WIDTH + (minuteDiff / 60) * CELL_WIDTH;

    console.log(
      `Rezervasyon ${startTime}-${endTime}: left=${startPosition}px, width=${width}px`
    );

    // Genişliği görünür alana sınırla
    const maxWidth = hours.length * CELL_WIDTH - startPosition;

    return {
      left: `${startPosition}px`,
      width: `${Math.min(width, maxWidth)}px`,
    };
  };

  // Rezervasyona tıklanınca işlem yap
  const handleReservationClick = (reservation: ReservationType) => {
    console.log("Rezervasyon seçildi:", reservation);
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
                        <div className="flex flex-1">
                          {hours.map((hour) => (
                            <div
                              key={`${table.id}-${hour}`}
                              className="border-r border-gray-200 h-full"
                              style={{
                                width: `${CELL_WIDTH}px`,
                                backgroundColor:
                                  hour === currentTime.substring(0, 5)
                                    ? "rgba(255, 255, 255, 0.5)"
                                    : "white",
                              }}
                            ></div>
                          ))}
                        </div>

                        {/* Rezervasyonlar */}
                        <div
                          className="absolute top-0 h-full pointer-events-none"
                          style={{
                            left: `${CATEGORY_WIDTH}px`,
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
                                  className="absolute rounded-sm cursor-pointer pointer-events-auto h-10 mt-2 flex items-center overflow-visible simple-tooltip"
                                  style={{
                                    left: position.left,
                                    width: position.width,
                                    backgroundColor: category.color,
                                    borderLeft: `4px solid ${category.borderColor}`,
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                                    position: "relative",
                                    minWidth: "80px", // Minimum genişlik
                                    zIndex: 5, // Z-indeksi ayarı
                                  }}
                                  onClick={() =>
                                    handleReservationClick(reservation)
                                  }
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

                                  {/* Basit tooltip */}
                                  <div className="tooltip-content">
                                    <div className="tooltip-row">
                                      <span>Saat:</span>
                                      <span>
                                        {reservation.startTime} -{" "}
                                        {reservation.endTime}
                                      </span>
                                    </div>
                                    <div className="tooltip-row">
                                      <span>Durum:</span>
                                      <span
                                        className={
                                          reservation.status === "confirmed"
                                            ? "text-green-600"
                                            : "text-amber-600"
                                        }
                                      >
                                        {reservation.status === "confirmed"
                                          ? "Onaylandı"
                                          : "Beklemede"}
                                      </span>
                                    </div>
                                    <div className="tooltip-id">
                                      ID: {reservation.id}
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

        /* Basit tooltip stili */
        .simple-tooltip {
          position: relative;
        }

        .simple-tooltip .tooltip-content {
          display: none;
          position: absolute;
          min-width: 220px;
          padding: 12px;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
          border: 1px solid #e5e7eb;
          z-index: 9999;
          color: #374151;
        }

        /* Ekranın sol tarafındaki rezervasyonlar için sağa doğru açılan tooltip */
        .simple-tooltip:has([style*="left: 0px"]) .tooltip-content,
        .simple-tooltip:has([style*="left: ${CELL_WIDTH}px"]) .tooltip-content,
        .simple-tooltip:has([style*="left: ${CELL_WIDTH * 2}px"])
          .tooltip-content {
          left: 100%;
          top: 0;
          margin-left: 10px;
        }

        /* Ekranın sol tarafındaki rezervasyonlar için ok */
        .simple-tooltip:has([style*="left: 0px"]) .tooltip-content::before,
        .simple-tooltip:has([style*="left: ${CELL_WIDTH}px"])
          .tooltip-content::before,
        .simple-tooltip:has([style*="left: ${CELL_WIDTH * 2}px"])
          .tooltip-content::before {
          content: "";
          position: absolute;
          top: 10px;
          left: -6px;
          width: 12px;
          height: 12px;
          background-color: white;
          transform: rotate(45deg);
          border-left: 1px solid #e5e7eb;
          border-bottom: 1px solid #e5e7eb;
        }

        /* Ekranın sağ tarafındaki rezervasyonlar için sola doğru açılan tooltip */
        .simple-tooltip:has([style*="left: ${CELL_WIDTH * 10}px"])
          .tooltip-content,
        .simple-tooltip:has([style*="left: ${CELL_WIDTH * 11}px"])
          .tooltip-content,
        .simple-tooltip:has([style*="left: ${CELL_WIDTH * 12}px"])
          .tooltip-content {
          right: 100%;
          top: 0;
          margin-right: 10px;
        }

        /* Ekranın sağ tarafındaki rezervasyonlar için ok */
        .simple-tooltip:has([style*="left: ${CELL_WIDTH * 10}px"])
          .tooltip-content::before,
        .simple-tooltip:has([style*="left: ${CELL_WIDTH * 11}px"])
          .tooltip-content::before,
        .simple-tooltip:has([style*="left: ${CELL_WIDTH * 12}px"])
          .tooltip-content::before {
          content: "";
          position: absolute;
          top: 10px;
          right: -6px;
          width: 12px;
          height: 12px;
          background-color: white;
          transform: rotate(45deg);
          border-right: 1px solid #e5e7eb;
          border-top: 1px solid #e5e7eb;
        }

        /* Varsayılan (orta) rezervasyonlar için aşağıya doğru açılan tooltip */
        .simple-tooltip:not(:has([style*="left: 0px"])):not(
            :has([style*="left: ${CELL_WIDTH}px"])
          ):not(:has([style*="left: ${CELL_WIDTH * 2}px"])):not(
            :has([style*="left: ${CELL_WIDTH * 10}px"])
          ):not(:has([style*="left: ${CELL_WIDTH * 11}px"])):not(
            :has([style*="left: ${CELL_WIDTH * 12}px"])
          )
          .tooltip-content {
          top: 100%;
          left: 0;
          margin-top: 10px;
        }

        /* Varsayılan (orta) rezervasyonlar için ok */
        .simple-tooltip:not(:has([style*="left: 0px"])):not(
            :has([style*="left: ${CELL_WIDTH}px"])
          ):not(:has([style*="left: ${CELL_WIDTH * 2}px"])):not(
            :has([style*="left: ${CELL_WIDTH * 10}px"])
          ):not(:has([style*="left: ${CELL_WIDTH * 11}px"])):not(
            :has([style*="left: ${CELL_WIDTH * 12}px"])
          )
          .tooltip-content::before {
          content: "";
          position: absolute;
          top: -6px;
          left: 20px;
          width: 12px;
          height: 12px;
          background-color: white;
          transform: rotate(45deg);
          border-left: 1px solid #e5e7eb;
          border-top: 1px solid #e5e7eb;
        }

        /* Son satırdaki rezervasyonlar için yukarıya doğru açılan tooltip */
        .simple-tooltip.bottom-row .tooltip-content {
          bottom: 100%;
          top: auto;
          margin-bottom: 10px;
        }

        /* Son satırdaki rezervasyonlar için ok */
        .simple-tooltip.bottom-row .tooltip-content::before {
          top: auto !important;
          bottom: -6px !important;
          border: none;
          border-right: 1px solid #e5e7eb;
          border-bottom: 1px solid #e5e7eb;
        }

        /* Tooltip görünürlüğü - hover */
        .simple-tooltip:hover .tooltip-content {
          display: block;
        }

        /* Tooltip içerik stilleri */
        .tooltip-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 12px;
          font-size: 14px;
        }

        .tooltip-id {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #e5e7eb;
          font-size: 12px;
          color: #6b7280;
        }

        /* Durum renkleri */
        .text-green-600 {
          color: #059669;
          font-weight: 500;
        }

        .text-amber-600 {
          color: #d97706;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
