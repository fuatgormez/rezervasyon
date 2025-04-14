"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { FiUsers, FiChevronDown } from "react-icons/fi";
import { BiSearch, BiArrowToLeft, BiArrowToRight } from "react-icons/bi";
import { IoMdRefresh } from "react-icons/io";
import { HiOutlineDotsVertical } from "react-icons/hi";

// Masa kategorisi arayüzü
interface TableCategoryType {
  id: string;
  name: string;
  color: string;
  borderColor: string;
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

export default function AdminPage() {
  const currentDate = new Date();
  const [currentTime, setCurrentTime] = useState(format(new Date(), "HH:mm"));
  const [currentTimePosition, setCurrentTimePosition] = useState<number | null>(
    null
  );
  const mainContentRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Mevcut rezervasyonlar
  const [reservations] = useState<ReservationType[]>([
    {
      id: "res-1",
      tableId: "t1",
      customerName: "Ahmet Yılmaz",
      guestCount: 4,
      startTime: "12:00",
      endTime: "14:00",
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
  ]);

  // Sabit hücre genişliği (piksel cinsinden)
  const CELL_WIDTH = 80;

  // Toplam hücre sayısı (9:00'dan 01:00'a kadar = 17 saat)
  const TOTAL_HOURS = 17;

  // Masa kategorileri
  const tableCategories: TableCategoryType[] = [
    {
      id: "1",
      name: "TERAS",
      color: "rgba(74, 108, 155, 0.8)",
      borderColor: "#5880B3",
    },
    {
      id: "2",
      name: "BAHÇE",
      color: "rgba(85, 138, 112, 0.8)",
      borderColor: "#509F6D",
    },
    {
      id: "3",
      name: "İÇ SALON",
      color: "rgba(166, 97, 97, 0.8)",
      borderColor: "#A06363",
    },
  ];

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

  // Güncel saat pozisyonu hesaplama
  const calculateCurrentTimePosition = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Eğer saat 9'dan önce veya 1'den sonra ise görünmeyecek şekilde ayarla
    if (hours < 9 || (hours > 1 && hours < 9)) {
      return null;
    }

    // 9 saatinden itibaren pozisyon hesapla (gece yarısından sonraki saatler için düzeltme)
    let offsetHour = hours;
    if (hours >= 0 && hours <= 1) {
      offsetHour = hours + 24; // 00:00 ve 01:00 için 24 ve 25 olarak hesapla
    }

    const hourOffset = (offsetHour - 9) * CELL_WIDTH;
    const minuteOffset = (minutes / 60) * CELL_WIDTH;

    // Maksimum pozisyonu sınırla (01:00'dan sonra gösterme)
    const maxPosition = TOTAL_HOURS * CELL_WIDTH;
    const calculatedPosition = hourOffset + minuteOffset;

    // Eğer hesaplanan pozisyon maksimum değeri geçerse null döndür
    if (calculatedPosition > maxPosition) {
      return null;
    }

    return calculatedPosition;
  };

  // Mevcut saati ve konumunu güncelleme - her saniye çalışacak
  useEffect(() => {
    // İlk başta pozisyonu ayarla
    setCurrentTimePosition(calculateCurrentTimePosition());

    // Her saniye çalışacak zamanlayıcı
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(format(now, "HH:mm:ss"));
      const newPosition = calculateCurrentTimePosition();
      setCurrentTimePosition(newPosition);
      console.log("Güncel saat pozisyonu:", newPosition); // Debug için
    }, 1000); // Her saniye güncelle

    return () => clearInterval(timer);
  }, []);

  // Saat bazında toplam misafir sayısını getir
  const getGuestCountForTimeSlot = (
    hour: string,
    reservationList: ReservationType[]
  ) => {
    // Belirli saat için rezervasyonları filtrele
    const filteredReservations = reservationList.filter((reservation) => {
      const startHour = parseInt(reservation.startTime.split(":")[0]);
      const endHour = parseInt(reservation.endTime.split(":")[0]);
      const currentHour = parseInt(hour.split(":")[0]);

      // 00:00 sonrası için ayarlama (gece yarısından sonra)
      const adjustedEndHour = endHour === 0 ? 24 : endHour;

      return startHour <= currentHour && adjustedEndHour > currentHour;
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
  const getReservationPosition = (startTime: string, endTime: string) => {
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    // Gece yarısından sonraki rezervasyonlar için ayarlama
    let adjustedEndHour = endHour;
    if (endHour < startHour || (endHour === 0 && startHour > 0)) {
      adjustedEndHour = endHour + 24;
    }

    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = adjustedEndHour * 60 + endMinute;

    // Pozisyon hesaplamaları (09:00'dan itibaren) - Grid tam denk gelecek şekilde ayarlama
    const startHourIndex = startHour - 9; // 09:00 = 0, 10:00 = 1, vb.
    const startPositionHour = startHourIndex * CELL_WIDTH;
    const startPositionMinute = (startMinute / 60) * CELL_WIDTH;
    const startPosition = startPositionHour + startPositionMinute;

    // Genişlik hesabı - tam saat dilimine hizalanacak şekilde
    const durationMinutes = endTotalMinutes - startTotalMinutes;
    const width = (durationMinutes / 60) * CELL_WIDTH;

    return {
      left: `${startPosition}px`,
      width: `${width}px`,
    };
  };

  // Rezervasyona tıklanınca işlem yap
  const handleReservationClick = (reservation: ReservationType) => {
    console.log("Rezervasyon seçildi:", reservation);
  };

  // Saat aralıkları
  const hours = useMemo(() => {
    const result = [];
    for (let i = 9; i <= 24; i++) {
      result.push(`${i.toString().padStart(2, "0")}:00`);
    }
    // Sadece 01:00'ı ekleyelim, daha sonrasını eklemiyoruz
    result.push(`01:00`);
    return result;
  }, []);

  // Toplam misafir sayısını hesapla
  const totalGuestCount = useMemo(() => {
    return reservations.reduce((total, res) => total + res.guestCount, 0);
  }, [reservations]);

  // Ana içerik genişliği hesaplama - kategori genişliği + tüm hücreler
  const mainContentWidth = 240 + TOTAL_HOURS * CELL_WIDTH;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 text-gray-800">
      {/* Navbar */}
      <div className="flex justify-between items-center bg-white p-4 border-b border-gray-200 shadow-sm">
        <div className="flex items-center space-x-6">
          <div className="text-2xl font-bold text-blue-600">Formitable</div>
          <div className="flex space-x-4">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Dashboard
            </button>
            <button className="px-4 py-2 rounded-lg hover:bg-gray-100">
              Reservations
            </button>
            <button className="px-4 py-2 rounded-lg hover:bg-gray-100">
              Guests
            </button>
            <button className="px-4 py-2 rounded-lg hover:bg-gray-100">
              Settings
            </button>
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
              style={{ width: `${mainContentWidth}px` }}
              className="relative"
            >
              {/* Saatler başlık satırı - Sticky */}
              <div className="sticky top-0 z-10 flex bg-white border-b border-gray-200">
                {/* Kategoriler için boş alan */}
                <div className="w-[240px] flex-shrink-0 h-14 bg-white border-r border-gray-200"></div>

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
                      className="w-[240px] flex-shrink-0 h-10 flex items-center px-4 border-b border-r font-semibold text-gray-600 text-sm"
                      style={{
                        borderColor: category.borderColor,
                        borderBottomWidth: "2px",
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
                        {/* Masa bilgisi sol tarafta */}
                        <div className="w-[240px] flex-shrink-0 flex items-center px-4 bg-gray-50 border-r border-gray-200">
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
                                    ? "rgba(59, 130, 246, 0.05)"
                                    : "transparent",
                              }}
                            ></div>
                          ))}
                        </div>

                        {/* Rezervasyonlar */}
                        <div className="absolute top-0 left-[240px] h-full w-full pointer-events-none">
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
                                  className={`absolute rounded-sm cursor-pointer pointer-events-auto h-10 mt-2 flex items-center overflow-hidden group ${
                                    reservation.status === "confirmed"
                                      ? ``
                                      : "opacity-70"
                                  }`}
                                  style={{
                                    left: position.left,
                                    width: position.width,
                                    backgroundColor: category.color,
                                    borderLeft: `4px solid ${category.borderColor}`,
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                                  }}
                                  onClick={() =>
                                    handleReservationClick(reservation)
                                  }
                                >
                                  {/* Sol tutamaç */}
                                  <div className="absolute left-0 top-0 h-full w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white bg-opacity-20"></div>

                                  <div className="px-3 py-1 text-xs truncate max-w-full text-white">
                                    <div className="font-medium">
                                      {reservation.customerName}
                                    </div>
                                    <div className="text-white text-opacity-90 text-[11px]">
                                      {reservation.guestCount} kişi
                                    </div>
                                  </div>

                                  {/* Sağ tutamaç */}
                                  <div className="absolute right-0 top-0 h-full w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white bg-opacity-20"></div>
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
                  className="absolute border-l-2 border-red-500 z-20 group hover:cursor-pointer transition-all duration-300"
                  style={{
                    left: `${240 + currentTimePosition}px`,
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
      `}</style>
    </div>
  );
}
