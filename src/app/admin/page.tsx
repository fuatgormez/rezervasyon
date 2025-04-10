"use client";

// Bu dosya 25 Mayıs 2024'te, saat 03:30 civarında olan versiyondur.
import { useState, useRef, useEffect } from "react";

interface TableType {
  id: string;
  number: number;
  capacity: number;
  status: "available" | "reserved" | "occupied" | "maintenance";
}

interface ReservationType {
  id: string;
  customerId: string;
  customerName: string;
  tableId: string;
  startTime: string;
  endTime: string;
  guests: number;
  status: "confirmed" | "pending" | "cancelled" | "completed";
  type: "RESERVATION" | "WALK_IN" | "SPECIAL";
  phone?: string;
  isNewGuest?: boolean;
  language?: string;
  color?: string;
}

export default function AdminPage() {
  const [timeSlots] = useState([
    "09:00",
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
    "01:00",
    "02:00",
  ]);

  const [tables] = useState<TableType[]>([
    { id: "t10", number: 10, capacity: 2, status: "available" },
    { id: "t11", number: 11, capacity: 2, status: "available" },
    { id: "t12", number: 12, capacity: 4, status: "available" },
    { id: "t13", number: 13, capacity: 4, status: "available" },
    { id: "t14", number: 14, capacity: 4, status: "available" },
    { id: "t15", number: 15, capacity: 4, status: "available" },
    { id: "t16", number: 16, capacity: 2, status: "available" },
    { id: "t17", number: 17, capacity: 2, status: "available" },
    { id: "t20", number: 20, capacity: 2, status: "available" },
    { id: "t21", number: 21, capacity: 2, status: "available" },
    { id: "t22", number: 22, capacity: 4, status: "available" },
    { id: "t23", number: 23, capacity: 4, status: "available" },
    { id: "t24", number: 24, capacity: 4, status: "available" },
    { id: "t25", number: 25, capacity: 4, status: "available" },
    { id: "t26", number: 26, capacity: 4, status: "available" },
    { id: "t30", number: 30, capacity: 4, status: "available" },
    { id: "t31", number: 31, capacity: 4, status: "available" },
    { id: "t33", number: 33, capacity: 4, status: "available" },
    { id: "t34", number: 34, capacity: 4, status: "available" },
    { id: "t35", number: 35, capacity: 4, status: "available" },
    { id: "t40", number: 40, capacity: 4, status: "available" },
  ]);

  const [reservations] = useState<ReservationType[]>([
    {
      id: "r1",
      customerId: "c1",
      customerName: "Benedetta Pompetzki",
      tableId: "t12",
      startTime: "19:00",
      endTime: "21:00",
      guests: 3,
      status: "confirmed",
      type: "RESERVATION",
    },
    {
      id: "r2",
      customerId: "c2",
      customerName: "Dogan Elmali",
      tableId: "t16",
      startTime: "18:00",
      endTime: "20:00",
      guests: 2,
      status: "confirmed",
      type: "RESERVATION",
    },
    {
      id: "r3",
      customerId: "c3",
      customerName: "Berkan Limon",
      tableId: "t16",
      startTime: "20:00",
      endTime: "22:00",
      guests: 2,
      status: "confirmed",
      type: "RESERVATION",
    },
    {
      id: "r4",
      customerId: "c4",
      customerName: "WALK-IN",
      tableId: "t33",
      startTime: "13:00",
      endTime: "15:00",
      guests: 1,
      status: "confirmed",
      type: "WALK_IN",
    },
    {
      id: "r5",
      customerId: "c5",
      customerName: "Nora",
      tableId: "t24",
      startTime: "18:00",
      endTime: "20:00",
      guests: 4,
      status: "confirmed",
      type: "RESERVATION",
    },
    {
      id: "r6",
      customerId: "c6",
      customerName: "WALK-IN",
      tableId: "t35",
      startTime: "13:00",
      endTime: "15:00",
      guests: 2,
      status: "confirmed",
      type: "WALK_IN",
    },
  ]);

  const [currentTime, setCurrentTime] = useState<string>("15:00");
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [selectedReservation, setSelectedReservation] =
    useState<ReservationType | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showCompanySettings, setShowCompanySettings] = useState(false);

  const timelineRef = useRef<HTMLDivElement>(null);
  const tablesScrollRef = useRef<HTMLDivElement>(null);

  // Gerçek zamana göre currentTime'ı güncelle
  useEffect(() => {
    // İlk açılışta şu anki zamanı ayarla
    const now = new Date();
    const hours = now.getHours();
    const formattedHours = hours.toString().padStart(2, "0");
    const currentTimeString = `${formattedHours}:00`;
    setCurrentTime(currentTimeString);

    // Her dakika zamanı güncelle
    const timer = setInterval(() => {
      const now = new Date();
      const hours = now.getHours();
      const formattedHours = hours.toString().padStart(2, "0");
      const currentTimeString = `${formattedHours}:00`;
      setCurrentTime(currentTimeString);
    }, 60000); // 1 dakikada bir güncelle

    return () => clearInterval(timer);
  }, []);

  // Scroll çubuğunu güncelle
  const updateScrollbar = (percentage: number) => {
    if (!timelineRef.current) return;

    const roundedPercentage = Math.round(percentage * 100) / 100;
    const maxScroll =
      timelineRef.current.scrollWidth - timelineRef.current.clientWidth;
    const newScrollLeft = maxScroll * roundedPercentage;

    timelineRef.current.scrollLeft = newScrollLeft;
  };

  // Kaydırma değişikliği işleyicisi - iki referansı senkronize eder
  const handleScrollChange = (
    sourceRef: React.RefObject<HTMLDivElement | null>
  ) => {
    if (!sourceRef.current || !timelineRef.current || !tablesScrollRef.current)
      return;

    const { scrollLeft, scrollWidth, clientWidth } = sourceRef.current;
    const scrollPercentage = scrollLeft / (scrollWidth - clientWidth || 1); // Sıfıra bölmeyi önle

    // Hangi ref'in değiştiğine bağlı olarak diğerini güncelle
    if (sourceRef === timelineRef && tablesScrollRef.current) {
      const maxScroll =
        tablesScrollRef.current.scrollWidth -
        tablesScrollRef.current.clientWidth;
      tablesScrollRef.current.scrollLeft = maxScroll * scrollPercentage;
    } else if (sourceRef === tablesScrollRef && timelineRef.current) {
      const maxScroll =
        timelineRef.current.scrollWidth - timelineRef.current.clientWidth;
      timelineRef.current.scrollLeft = maxScroll * scrollPercentage;
    }

    // Scroll çubuğunu güncelle
    updateScrollbar(scrollPercentage);
  };

  // Sürükleme işlemleri için event handler'lar
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;

    setIsDragging(true);
    setStartX(e.pageX - timelineRef.current.offsetLeft);
    setScrollLeft(timelineRef.current.scrollLeft);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !timelineRef.current) return;

    e.preventDefault();
    const x = e.pageX - timelineRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    timelineRef.current.scrollLeft = scrollLeft - walk;

    // Scroll değişikliğini diğer ref'e yansıt
    handleScrollChange(timelineRef);
  };

  // Touch olayları için handler'lar
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!timelineRef.current) return;

    setIsDragging(true);
    setStartX(e.touches[0].pageX - timelineRef.current.offsetLeft);
    setScrollLeft(timelineRef.current.scrollLeft);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !timelineRef.current) return;

    const x = e.touches[0].pageX - timelineRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    timelineRef.current.scrollLeft = scrollLeft - walk;

    // Scroll değişikliğini diğer ref'e yansıt
    handleScrollChange(timelineRef);
  };

  // Rezervasyona tıklama işleyicisi
  const handleReservationClick = (reservation: ReservationType) => {
    // Telefon numarası, yeni misafir ve dil bilgilerini ekleyelim
    // Gerçek senaryoda bu bilgiler API'den gelecektir
    const enhancedReservation: ReservationType = {
      ...reservation,
      phone:
        reservation.customerName === "Benedetta Pompetzki"
          ? "+491516760458"
          : reservation.customerName === "Dogan Elmali"
          ? "+491773458990"
          : reservation.customerName === "Berkan Limon"
          ? "+491624789032"
          : "",
      isNewGuest: reservation.customerName === "Benedetta Pompetzki",
      language: "DE",
      color:
        reservation.type === "RESERVATION"
          ? "#f472b6"
          : reservation.type === "WALK_IN"
          ? "#14b8a6"
          : "#eab308",
    };

    setSelectedReservation(enhancedReservation);
    setIsSidebarOpen(true);
  };

  // Yeni müşteri ekleme işleyicisi
  const handleAddCustomer = () => {
    // Yeni rezervasyon oluştur
    const newReservation: ReservationType = {
      id: `r${reservations.length + 1}`,
      customerId: `c${reservations.length + 1}`,
      customerName: "Yeni Rezervasyon",
      tableId: "t12", // Varsayılan masa
      startTime: "19:00", // Varsayılan başlangıç saati
      endTime: "21:00", // Varsayılan bitiş saati
      guests: 2, // Varsayılan misafir sayısı
      status: "confirmed",
      type: "RESERVATION",
      phone: "",
      isNewGuest: true,
      language: "DE",
    };

    // Rezervasyonları güncelle
    // Not: Bu örnek için useState kullanıldığından direkt atama yapamıyoruz
    // Gerçek uygulamada useState setter veya Context API kullanılabilir
    // setReservations([...reservations, newReservation]);

    // Yeni eklenen rezervasyonu seç ve sidebar'ı aç
    setSelectedReservation(newReservation);
    setIsSidebarOpen(true);
  };

  // Sidebar'ı kapatma işleyicisi
  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };

  // Global event listener'lar
  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchend", handleMouseUp);

    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, []);

  // Rezervasyon rengini belirle
  const getReservationColor = (type: ReservationType["type"]) => {
    switch (type) {
      case "RESERVATION":
        return "bg-pink-500";
      case "WALK_IN":
        return "bg-teal-500";
      case "SPECIAL":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  // Rezervasyon tipini kısaltma olarak göster
  const getReservationTypeShort = (type: ReservationType["type"]) => {
    switch (type) {
      case "RESERVATION":
        return "RE";
      case "WALK_IN":
        return "WA";
      case "SPECIAL":
        return "SP";
      default:
        return "";
    }
  };

  // Rezervasyon pozisyonunu hesapla
  const getReservationPosition = (startTime: string, endTime: string) => {
    const startIndex = timeSlots.indexOf(startTime);
    const endIndex = timeSlots.indexOf(endTime);

    if (startIndex === -1 || endIndex === -1) return {};

    const cellWidth = 80; // Her hücrenin genişliği
    const start = startIndex * cellWidth;
    const width = (endIndex - startIndex) * cellWidth;

    return {
      left: `${start}px`,
      width: `${width}px`,
    };
  };

  // Masa kapasitesini görüntüle
  const getTableCapacity = (capacity: number) => {
    return `${capacity}`.padStart(2, " ");
  };

  // Şu anki saate göre otomatik scroll
  useEffect(() => {
    // Başlangıçta görünür bir konuma scroll yap
    if (timelineRef.current) {
      const scrollToPosition = Math.max(0, 480); // Örnek olarak 6. saat pozisyonuna
      timelineRef.current.scrollLeft = scrollToPosition;

      // Scroll değişikliğini tabloya da yansıt
      if (tablesScrollRef.current) {
        tablesScrollRef.current.scrollLeft = scrollToPosition;
      }
    }
  }, [currentTime]);

  // Masanın belirli bir saatte müsait olup olmadığını kontrol et
  const getTableAvailability = (tableId: string, time: string) => {
    if (!time) return false;

    const existingReservation = reservations.find(
      (res) => res.tableId === tableId && res.startTime === time
    );

    return !existingReservation;
  };

  return (
    <div className="h-screen bg-[#1e1e1e] text-white overflow-hidden">
      {/* Navbar */}
      <div className="flex items-center justify-between bg-[#1e1e1e] border-b border-gray-800 p-2">
        <h1 className="text-lg font-semibold">Rezervasyon Sistemi</h1>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-700"
            onClick={handleAddCustomer}
          >
            + Rezervasyon
          </button>
          <button
            className="px-3 py-1 bg-gray-700 rounded text-sm hover:bg-gray-600 flex items-center"
            onClick={() => setShowCompanySettings(true)}
            aria-label="Firma Ayarları"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Firma Ayarları
          </button>
        </div>
      </div>

      {/* Ana içerik */}
      <div className="h-[calc(100vh-48px)] overflow-hidden">
        {/* Sabit başlık - Sitzend (Oturan) alanı */}
        <div className="sticky left-0 top-0 bg-[#1e1e1e] z-30 flex border-b border-gray-800">
          <div className="w-16 shrink-0 p-2 text-xs font-medium bg-[#1e1e1e] text-center flex items-center justify-between">
            <span>Sitzend</span>
            <span className="text-gray-500">›</span>
          </div>
        </div>

        {/* Zaman çizelgesi */}
        <div className="relative">
          {/* Saat başlıkları */}
          <div
            ref={timelineRef}
            className="sticky top-0 z-20 flex overflow-x-auto hide-scrollbar"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleMouseUp}
            onTouchMove={handleTouchMove}
            onScroll={() => handleScrollChange(timelineRef)}
          >
            <div className="w-16 shrink-0 bg-[#1e1e1e] z-30 sticky left-0"></div>
            {timeSlots.map((time, index) => (
              <div
                key={`time-${index}`}
                className={`w-20 shrink-0 p-2 text-center text-xs border-l border-gray-800 relative ${
                  time === currentTime
                    ? "bg-gray-700 text-white"
                    : parseInt(time) >= 18 && parseInt(time) <= 23
                    ? "bg-gray-800/30"
                    : parseInt(time) >= 0 && parseInt(time) <= 5
                    ? "bg-gray-900/40"
                    : "bg-transparent"
                }`}
              >
                {time}
                <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gray-800" />
                <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-[10px] text-gray-500">
                  {/* Dolu masa sayısını göster - Gerçek uygulamada hesaplanır */}
                  {reservations.filter((r) => r.startTime === time).length}
                </div>
              </div>
            ))}
          </div>

          {/* Ana tablo içeriği */}
          <div className="flex">
            {/* Sabit sol sütun - Masa numaraları */}
            <div className="w-16 shrink-0 sticky left-0 z-10 bg-[#1e1e1e]">
              {tables.map((table) => (
                <div
                  key={`table-${table.id}`}
                  className="h-10 flex items-center justify-between px-2 border-b border-gray-800 text-xs"
                >
                  <span className="text-gray-400">{table.id}</span>
                  <span className="text-gray-600">
                    {getTableCapacity(table.capacity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Tablo ana içeriği */}
            <div
              className="flex-1 overflow-x-auto hide-scrollbar"
              ref={tablesScrollRef}
              onScroll={() => handleScrollChange(tablesScrollRef)}
            >
              {/* Tablo satırları */}
              <div className="relative">
                {tables.map((table) => (
                  <div
                    key={`row-${table.id}`}
                    className="relative h-10 border-b border-gray-800"
                  >
                    {/* Her masa için timeslot'lar */}
                    <div className="flex h-full">
                      {timeSlots.map((time, i) => (
                        <div
                          key={`slot-${table.id}-${i}`}
                          className={`w-20 shrink-0 border-l border-gray-800 h-full ${
                            time === currentTime
                              ? "bg-gray-700/20"
                              : parseInt(time) >= 18 && parseInt(time) <= 23
                              ? "bg-gray-800/10"
                              : parseInt(time) >= 0 && parseInt(time) <= 5
                              ? "bg-gray-900/20"
                              : "bg-transparent"
                          }`}
                        ></div>
                      ))}
                    </div>

                    {/* Masa için rezervasyonlar */}
                    {reservations
                      .filter((res) => res.tableId === table.id)
                      .map((reservation) => (
                        <div
                          key={`reservation-${reservation.id}`}
                          className={`absolute top-1 h-8 ${getReservationColor(
                            reservation.type
                          )} rounded flex items-center px-2 text-xs whitespace-nowrap overflow-hidden cursor-pointer hover:brightness-110`}
                          style={getReservationPosition(
                            reservation.startTime,
                            reservation.endTime
                          )}
                          onClick={() => handleReservationClick(reservation)}
                        >
                          <span className="mr-2">{reservation.guests}</span>
                          <span className="mr-2">
                            {reservation.customerName}
                          </span>
                          <span className="ml-auto bg-black bg-opacity-30 px-1 rounded">
                            {getReservationTypeShort(reservation.type)}
                          </span>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Firma Ayarları Modal */}
      {showCompanySettings && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center overflow-y-auto">
          <div className="bg-[#232323] w-11/12 max-w-5xl rounded-lg shadow-lg max-h-[90vh] flex flex-col">
            {/* Üst başlık */}
            <div className="flex justify-between items-center bg-[#1e1e1e] p-4 border-b border-gray-800 rounded-t-lg">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center mr-3">
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
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold">Firma Ayarları</h2>
              </div>
              <button
                className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700"
                onClick={() => setShowCompanySettings(false)}
                aria-label="Kapat"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {/* İçerik */}
            <div className="flex flex-col h-full overflow-hidden">
              {/* Sekmeler */}
              <div className="flex border-b border-gray-800">
                <button className="flex-1 p-4 text-center border-b-2 border-blue-500 text-blue-400 font-medium">
                  Firma Bilgileri
                </button>
                <button className="flex-1 p-4 text-center text-gray-400 hover:text-gray-300">
                  Çalışma Saatleri
                </button>
                <button className="flex-1 p-4 text-center text-gray-400 hover:text-gray-300">
                  Masalar
                </button>
                <button className="flex-1 p-4 text-center text-gray-400 hover:text-gray-300">
                  Garsonlar
                </button>
                <button className="flex-1 p-4 text-center text-gray-400 hover:text-gray-300">
                  Ödeme Ayarları
                </button>
                <button className="flex-1 p-4 text-center text-gray-400 hover:text-gray-300">
                  Müşteriler
                </button>
              </div>

              {/* Sekmenin içeriği */}
              <div className="p-6 overflow-y-auto flex-1">
                {/* Firma Bilgileri */}
                <div>
                  <div className="mb-8 flex items-center">
                    <div className="w-24 h-24 bg-gray-700 rounded-lg flex items-center justify-center mr-6">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-12 w-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-1">Logo Yükle</h3>
                      <p className="text-gray-400 mb-3">
                        PNG, JPG veya SVG, 4MB&apos;dan küçük
                      </p>
                      <button className="px-4 py-2 bg-blue-600 rounded text-sm hover:bg-blue-700">
                        Logo Seç
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="mb-4">
                      <label className="block text-gray-400 text-sm mb-2">
                        Firma Adı
                      </label>
                      <input
                        type="text"
                        className="w-full bg-[#2a2a2a] border border-gray-700 rounded p-3 text-white"
                        placeholder="Restaurant Name"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-gray-400 text-sm mb-2">
                        Vergi Numarası
                      </label>
                      <input
                        type="text"
                        className="w-full bg-[#2a2a2a] border border-gray-700 rounded p-3 text-white"
                        placeholder="123456789"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-gray-400 text-sm mb-2">
                        Telefon
                      </label>
                      <input
                        type="tel"
                        className="w-full bg-[#2a2a2a] border border-gray-700 rounded p-3 text-white"
                        placeholder="+90 (xxx) xxx-xxxx"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-gray-400 text-sm mb-2">
                        E-posta
                      </label>
                      <input
                        type="email"
                        className="w-full bg-[#2a2a2a] border border-gray-700 rounded p-3 text-white"
                        placeholder="info@restaurant.com"
                      />
                    </div>

                    <div className="mb-4 col-span-2">
                      <label className="block text-gray-400 text-sm mb-2">
                        Adres
                      </label>
                      <textarea
                        className="w-full bg-[#2a2a2a] border border-gray-700 rounded p-3 text-white"
                        rows={3}
                        placeholder="Restaurant adresi"
                      ></textarea>
                    </div>

                    <div className="mb-4">
                      <label className="block text-gray-400 text-sm mb-2">
                        Website
                      </label>
                      <input
                        type="url"
                        className="w-full bg-[#2a2a2a] border border-gray-700 rounded p-3 text-white"
                        placeholder="https://restaurant.com"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-gray-400 text-sm mb-2">
                        Sosyal Medya
                      </label>
                      <input
                        type="url"
                        className="w-full bg-[#2a2a2a] border border-gray-700 rounded p-3 text-white"
                        placeholder="Instagram URL"
                      />
                    </div>

                    <div className="mb-4 col-span-2">
                      <label className="block text-gray-400 text-sm mb-2">
                        Rezervasyon Ayarları
                      </label>
                      <div className="flex items-center mt-2">
                        <input
                          type="checkbox"
                          id="enableReservations"
                          className="mr-2"
                        />
                        <label htmlFor="enableReservations">
                          Rezervasyonları aktif et
                        </label>
                      </div>
                      <div className="flex items-center mt-2">
                        <input
                          type="checkbox"
                          id="requireDeposit"
                          className="mr-2"
                        />
                        <label htmlFor="requireDeposit">
                          Rezervasyon için depozito iste
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <button className="px-6 py-3 bg-green-600 rounded font-medium hover:bg-green-700">
                      Değişiklikleri Kaydet
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rezervasyon Sidebar */}
      {isSidebarOpen && selectedReservation && (
        <div className="fixed top-0 right-0 w-96 h-full bg-[#232323] z-50 shadow-lg transform transition-transform duration-300">
          {/* Üst başlık */}
          <div className="flex justify-between items-center bg-[#1e1e1e] p-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold">Reservierung</h2>
            <div className="flex space-x-4">
              <button
                className="p-2 bg-green-600 rounded text-white hover:bg-green-700 text-sm"
                onClick={handleCloseSidebar}
              >
                Speichern
              </button>
              <button
                className="p-2 text-gray-400 hover:text-white"
                onClick={handleCloseSidebar}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Sekmeler */}
          <div className="flex border-b border-gray-800">
            <div className="flex-1 p-3 text-center border-b-2 border-blue-500 text-blue-400">
              <div className="mx-auto w-6 h-6 mb-1">
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
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <span className="text-xs">Gast</span>
            </div>
            <div className="flex-1 p-3 text-center text-gray-500">
              <div className="mx-auto w-6 h-6 mb-1 relative">
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
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                {selectedReservation.type === "RESERVATION" && (
                  <div className="absolute -top-1 -right-1 bg-gray-700 text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    0
                  </div>
                )}
              </div>
              <span className="text-xs">Benachrichtigung</span>
            </div>
            <div className="flex-1 p-3 text-center text-gray-500">
              <div className="mx-auto w-6 h-6 mb-1">
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <span className="text-xs">Rechnung</span>
            </div>
            <div className="flex-1 p-3 text-center text-gray-500">
              <div className="mx-auto w-6 h-6 mb-1">
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
                    d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                  />
                </svg>
              </div>
              <span className="text-xs">Geschenk</span>
            </div>
          </div>

          {/* Butonlar */}
          <div className="p-3 flex space-x-2">
            <button className="flex-1 py-3 bg-[#2a2a2a] rounded text-gray-300 text-sm font-medium">
              Einchecken
            </button>
            <button className="flex-1 py-3 bg-[#2a2a2a] rounded text-gray-300 text-sm font-medium">
              Auschecken
            </button>
            <button className="flex-1 py-3 bg-[#2a2a2a] rounded text-gray-300 text-sm font-medium">
              No-Show
            </button>
          </div>

          {/* Müşteri bilgileri */}
          <div className="p-4 bg-[#2a2a2a] rounded-lg mx-3 mb-3">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white mr-4">
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
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <h3 className="text-white font-semibold">
                    {selectedReservation.customerName}
                  </h3>
                  <button className="text-gray-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                </div>
                <div className="text-gray-300 text-sm">
                  {selectedReservation.phone}
                </div>
                <div className="flex mt-2 text-sm space-x-3">
                  <div className="flex items-center text-gray-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span>
                      {selectedReservation.isNewGuest ? "New guest" : "Regular"}
                    </span>
                  </div>
                  <div className="flex items-center text-gray-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                      />
                    </svg>
                    <span>{selectedReservation.language}</span>
                  </div>
                </div>
              </div>
            </div>
            <button className="mt-3 w-full flex items-center justify-center py-2 text-gray-400 bg-[#333] rounded">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </button>
          </div>

          {/* Form alanları */}
          <div className="px-3">
            <div className="mb-3">
              <div className="text-gray-400 text-sm mb-1">Ticket</div>
              <div className="bg-[#2a2a2a] p-3 rounded flex justify-between items-center">
                <div className="font-medium">RESERVIERUNG</div>
                <div className="flex items-center">
                  <span className="bg-pink-500 px-2 py-1 rounded text-xs mr-2">
                    RE
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <div className="text-gray-400 text-sm mb-1">Datum</div>
              <div className="bg-[#2a2a2a] p-3 rounded flex justify-between items-center">
                <div className="font-medium">Mi. 09 Apr.</div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>

            <div className="flex space-x-3 mb-3">
              <div className="flex-1">
                <div className="text-gray-400 text-sm mb-1">Start</div>
                <div className="bg-[#2a2a2a] p-3 rounded flex justify-between items-center">
                  <div className="font-medium">
                    {selectedReservation.startTime}
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <div className="text-gray-400 text-sm mb-1">Ende</div>
                <div className="bg-[#2a2a2a] p-3 rounded flex justify-between items-center">
                  <div className="font-medium">
                    {selectedReservation.endTime}
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <div className="text-gray-400 text-sm mb-1">Personen</div>
              <div className="bg-[#2a2a2a] p-3 rounded">
                <div className="flex justify-between space-x-2">
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      className={`flex-1 py-1 px-2 rounded ${
                        num === selectedReservation.guests
                          ? "bg-gray-700 text-white"
                          : "text-gray-400"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  <button className="flex-1 py-1 px-2 rounded text-gray-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mx-auto"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <div className="text-gray-400 text-sm mb-1">Tisch</div>
              <div className="bg-[#2a2a2a] p-3 rounded">
                <div className="grid grid-cols-5 gap-2 mb-2">
                  {tables.slice(0, 10).map((table) => (
                    <button
                      key={table.id}
                      className={`py-2 rounded-md text-xs font-medium ${
                        selectedReservation?.tableId === table.id
                          ? "bg-blue-600 text-white"
                          : getTableAvailability(
                              table.id,
                              selectedReservation?.startTime || ""
                            )
                          ? "bg-gray-700 text-white hover:bg-gray-600"
                          : "bg-gray-800 text-gray-500 cursor-not-allowed"
                      }`}
                      onClick={() => {
                        if (
                          selectedReservation &&
                          getTableAvailability(
                            table.id,
                            selectedReservation.startTime
                          )
                        ) {
                          setSelectedReservation({
                            ...selectedReservation,
                            tableId: table.id,
                          });
                        }
                      }}
                      disabled={
                        selectedReservation
                          ? !getTableAvailability(
                              table.id,
                              selectedReservation.startTime
                            )
                          : true
                      }
                    >
                      {table.number}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-2">
                  <div className="text-xs text-gray-500">
                    <span className="inline-block w-3 h-3 bg-gray-700 mr-1 rounded-sm"></span>{" "}
                    Müsait
                  </div>
                  <div className="text-xs text-gray-500">
                    <span className="inline-block w-3 h-3 bg-blue-600 mr-1 rounded-sm"></span>{" "}
                    Seçili
                  </div>
                  <div className="text-xs text-gray-500">
                    <span className="inline-block w-3 h-3 bg-gray-800 mr-1 rounded-sm"></span>{" "}
                    Dolu
                  </div>
                </div>
              </div>
            </div>

            <div className="my-4">
              <button className="w-full py-3 bg-[#2a2a2a] text-center text-gray-300 rounded">
                Besten Tisch auswählen
              </button>
            </div>

            <div className="flex space-x-2 mb-4">
              {[
                "#4ade80",
                "#60a5fa",
                "#a78bfa",
                "#f472b6",
                "#fb923c",
                "#fbbf24",
                "#f87171",
              ].map((color) => (
                <button
                  key={color}
                  aria-label={`Renk seç: ${color}`}
                  title={`Renk seç: ${color}`}
                  className={`w-10 h-10 rounded-sm ${
                    color === selectedReservation.color
                      ? "ring-2 ring-white"
                      : ""
                  }`}
                  style={{ backgroundColor: color }}
                ></button>
              ))}
              <button className="w-10 h-10 rounded-sm flex items-center justify-center bg-[#2a2a2a]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-white"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            <div className="mb-3">
              <div className="text-gray-400 text-sm mb-1">
                Reservierungshinweis
              </div>
              <textarea
                className="w-full h-32 bg-[#2a2a2a] rounded p-3 text-white"
                placeholder=""
              ></textarea>
            </div>

            <div className="flex items-center text-gray-400 py-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
              <span>Eine Datei anhängen...</span>
            </div>

            <div className="py-3 border-t border-gray-800 text-gray-500 text-xs flex justify-between mt-4">
              <div>BcL5J3giDw</div>
              <div className="flex">
                <button className="mr-3">
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
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
                <button>
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
                </button>
              </div>
            </div>

            <div className="text-center pt-2 text-xs text-gray-500">
              Erstellt von Website am 7. April 2025 11:19
            </div>
          </div>
        </div>
      )}

      {/* Global stiller */}
      <style jsx global>{`
        /* Scrollbar gizleme */
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
