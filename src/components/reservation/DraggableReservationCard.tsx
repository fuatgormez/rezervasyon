import React, { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import ReservationConfirmModal from "@/components/ui/ReservationConfirmModal";

// Reservation türü
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
  staffIds?: string[];
}

interface DraggableReservationCardProps {
  reservation: ReservationType;
  cellWidth: number;
  cellHeight: number;
  position: { left: string; width: string };
  categoryColor: string;
  categoryBorderColor: string;
  onReservationClick: (reservation: ReservationType) => void;
  onReservationHover: (reservation: ReservationType) => void;
  onReservationLeave: () => void;
  onReservationUpdate: (
    reservation: ReservationType,
    oldReservation?: ReservationType
  ) => void;
  hasTableConflict: (
    tableId: string,
    startTime: string,
    endTime: string,
    excludeReservationId?: string
  ) => boolean;
  reservationColor?: string;
  reservationStatuses?: Record<string, "arrived" | "departed" | null>;
  isReservationPast?: (startTime: string) => boolean;
  showConfirmation?: (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel: () => void
  ) => void;
  onResizeStart?: (
    e: React.MouseEvent,
    reservationId: string,
    direction: "start" | "end"
  ) => void;
  tables?: Array<{ id: string; number: number; capacity: number }>;
  currentTableId?: string;
  timeSlots: string[];
}

const DraggableReservationCard: React.FC<DraggableReservationCardProps> = ({
  reservation,
  cellWidth,
  cellHeight,
  position,
  categoryColor,
  categoryBorderColor,
  onReservationClick,
  onReservationHover,
  onReservationLeave,
  onReservationUpdate,
  hasTableConflict,
  reservationColor,
  reservationStatuses,
  isReservationPast,
  showConfirmation,
  onResizeStart,
  tables,
  currentTableId,
  timeSlots,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedReservation, setDraggedReservation] =
    useState<ReservationType | null>(null);
  const [initialStartTime, setInitialStartTime] = useState("");
  const [initialEndTime, setInitialEndTime] = useState("");
  const [initialTableId, setInitialTableId] = useState("");
  const [hasMoved, setHasMoved] = useState(false);
  const [targetTableId, setTargetTableId] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<null | {
    updated: ReservationType;
    original: ReservationType;
  }>(null);

  const cardRef = useRef<HTMLDivElement>(null);

  // --- TOUCH EVENTS FOR MOBILE ---
  const [touchStartPos, setTouchStartPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [touchDragging, setTouchDragging] = useState(false);
  const [touchDraggedReservation, setTouchDraggedReservation] =
    useState<ReservationType | null>(null);
  const [showMobileActionModal, setShowMobileActionModal] = useState(false);
  const [mobileActionType, setMobileActionType] = useState<
    null | "move" | "resize"
  >(null);

  // Mobilde masa ve saat seçimi için grid modalı
  const [showMobileGridModal, setShowMobileGridModal] = useState(false);
  const [mobileGridAction, setMobileGridAction] = useState<
    null | "move" | "resize"
  >(null);

  // Rezervasyonun geçmiş olup olmadığını kontrol et
  const isPastReservation = isReservationPast
    ? isReservationPast(reservation.startTime)
    : false;

  // Debug: Rezervasyon bilgilerini ve zaman hesaplamalarını yazdıralım
  useEffect(() => {
    if (isPastReservation) {
      console.log(
        `Geçmiş rezervasyon: ${reservation.id} - ${reservation.customerName} (${reservation.startTime})`
      );
    }
  }, [
    isPastReservation,
    reservation.id,
    reservation.customerName,
    reservation.startTime,
  ]);

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
    try {
      // Eğer tarih+saat formatı ise (2025-05-15 23:10 veya 2025-05-15T23:10) sadece saat kısmını al
      let timeOnly = time;

      // Tarih kısmını temizle - T ile ayrılmış format
      if (time.includes("T")) {
        timeOnly = time.split("T")[1].substring(0, 5);
      }
      // Tarih kısmını temizle - boşluk ile ayrılmış format
      else if (time.includes(" ")) {
        timeOnly = time.split(" ")[1].substring(0, 5);
      }

      console.log(`Zaman dönüşümü: '${time}' -> '${timeOnly}'`);

      const [hoursStr, minutesStr] = timeOnly.split(":");
      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);

      // Geçersiz değerleri kontrol et
      if (isNaN(hours) || isNaN(minutes)) {
        console.error("Geçersiz saat değeri:", timeOnly);
        return 0; // Varsayılan değer
      }

      return hours * 60 + minutes;
    } catch (error) {
      console.error("Zaman dönüşümü hatası:", error, "Orijinal değer:", time);
      return 0; // Hata durumunda varsayılan değer
    }
  };

  // Dakikayı en yakın 15'lik periyoda özel olarak yuvarla
  const snapToCustom15 = (minutes: number) => {
    const hour = Math.floor(minutes / 60);
    const min = minutes % 60;
    let snappedMin = 0;
    if (min <= 7) snappedMin = 0;
    else if (min <= 22) snappedMin = 15;
    else if (min <= 37) snappedMin = 30;
    else if (min <= 52) snappedMin = 45;
    else {
      // 53 ve sonrası bir sonraki saat başı
      return (hour + 1) * 60;
    }
    return hour * 60 + snappedMin;
  };

  // Sürükleme işlevselliği
  const [dragStartPos, setDragStartPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Geçmiş rezervasyonların taşınmasını engelle
    if (isReservationPast && isReservationPast(reservation.startTime)) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    setHasMoved(false);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDraggedReservation({ ...reservation });
    setInitialStartTime(reservation.startTime);
    setInitialEndTime(reservation.endTime);
    setInitialTableId(reservation.tableId);

    console.log("Sürükleme başladı:", reservation.id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !draggedReservation || !dragStartPos) return;

    e.preventDefault();

    const deltaX = e.clientX - dragStartPos.x;
    const deltaY = e.clientY - dragStartPos.y;

    // Hareket varsa hasMoved'ı true yap
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      setHasMoved(true);
    }

    // Yatay sürükleme için zaman hesaplama
    const cellWidthMinutes = 60;
    let minuteOffsetRaw = (deltaX / cellWidth) * cellWidthMinutes;
    let newStartMinutes =
      convertTimeToMinutes(initialStartTime) + minuteOffsetRaw;
    newStartMinutes = snapToCustom15(newStartMinutes);

    const duration =
      convertTimeToMinutes(initialEndTime) -
      convertTimeToMinutes(initialStartTime);
    let newEndMinutes = newStartMinutes + duration;

    let newStartTime = convertMinutesToTime(newStartMinutes);
    let newEndTime = convertMinutesToTime(newEndMinutes);

    // Orijinal formatta tarih kısmı varsa, koru
    if (initialStartTime.includes("T")) {
      const datePart = initialStartTime.split("T")[0];
      newStartTime = `${datePart}T${newStartTime}`;
      const endDatePart = initialEndTime.split("T")[0];
      newEndTime = `${endDatePart}T${newEndTime}`;
    } else if (initialStartTime.includes(" ")) {
      const datePart = initialStartTime.split(" ")[0];
      newStartTime = `${datePart} ${newStartTime}`;
      const endDatePart = initialEndTime.split(" ")[0];
      newEndTime = `${endDatePart} ${newEndTime}`;
    }

    // Dikey sürükleme için masa değişikliği hesaplama
    if (tables && currentTableId) {
      const currentTableIndex = tables.findIndex(
        (t) => t.id === currentTableId
      );
      if (currentTableIndex !== -1) {
        const cellHeight = 30; // Her masanın yüksekliği
        const tableOffset = Math.round(deltaY / cellHeight);
        const targetTableIndex = currentTableIndex + tableOffset;

        if (targetTableIndex >= 0 && targetTableIndex < tables.length) {
          const newTableId = tables[targetTableIndex].id;
          setTargetTableId(newTableId);
          draggedReservation.tableId = newTableId;
        }
      }
    }

    draggedReservation.startTime = newStartTime;
    draggedReservation.endTime = newEndTime;

    setDraggedReservation({ ...draggedReservation });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging) {
      // Hiç sürükleme olmadıysa, bu bir tıklama olayıdır
      e.stopPropagation();
      onReservationClick(reservation);
      return;
    }

    // Sürükleme olduysa ama hareket azsa, tıklama olarak değerlendir
    if (!hasMoved) {
      console.log("Hareket yok, tıklama olarak değerlendiriliyor");
      e.stopPropagation();
      onReservationClick(reservation);
      setIsDragging(false);
      setDragStartPos(null);
      setDraggedReservation(null);
      setHasMoved(false);
      return;
    }

    // Normal sürükleme işlemi
    if (!draggedReservation || !dragStartPos) {
      setIsDragging(false);
      setDragStartPos(null);
      setDraggedReservation(null);
      setHasMoved(false);
      return;
    }

    // Zaman değişimi oldu mu kontrol et
    const hasTimeChanged =
      initialStartTime !== draggedReservation.startTime ||
      initialEndTime !== draggedReservation.endTime;

    // Masa değişimi oldu mu kontrol et
    const hasTableChanged = initialTableId !== draggedReservation.tableId;

    // Çakışma kontrolü
    const hasConflict = hasTableConflict(
      draggedReservation.tableId,
      draggedReservation.startTime,
      draggedReservation.endTime,
      draggedReservation.id
    );

    if (hasConflict) {
      toast.error("Bu masa ve saatte çakışma var!");
      setIsDragging(false);
      setDragStartPos(null);
      setDraggedReservation(null);
      setHasMoved(false);
      setTargetTableId(null);
      return;
    }

    const originalReservation = { ...reservation };
    if (hasTimeChanged || hasTableChanged) {
      console.log("Rezervasyon güncelleniyor:", draggedReservation);
      setPendingUpdate({
        updated: { ...draggedReservation },
        original: originalReservation,
      });
      setShowModal(true);
    }

    setIsDragging(false);
    setDragStartPos(null);
    setDraggedReservation(null);
    setHasMoved(false);
    setTargetTableId(null);
  };

  // Global mouse event'leri için useEffect
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!draggedReservation || !dragStartPos) return;

        const deltaX = e.clientX - dragStartPos.x;
        const deltaY = e.clientY - dragStartPos.y;

        const cellWidthMinutes = 60;
        let minuteOffsetRaw = (deltaX / cellWidth) * cellWidthMinutes;
        let newStartMinutes =
          convertTimeToMinutes(initialStartTime) + minuteOffsetRaw;
        newStartMinutes = snapToCustom15(newStartMinutes);

        const duration =
          convertTimeToMinutes(initialEndTime) -
          convertTimeToMinutes(initialStartTime);
        let newEndMinutes = newStartMinutes + duration;

        let newStartTime = convertMinutesToTime(newStartMinutes);
        let newEndTime = convertMinutesToTime(newEndMinutes);

        if (initialStartTime.includes("T")) {
          const datePart = initialStartTime.split("T")[0];
          newStartTime = `${datePart}T${newStartTime}`;
          const endDatePart = initialEndTime.split("T")[0];
          newEndTime = `${endDatePart}T${newEndTime}`;
        } else if (initialStartTime.includes(" ")) {
          const datePart = initialStartTime.split(" ")[0];
          newStartTime = `${datePart} ${newStartTime}`;
          const endDatePart = initialEndTime.split(" ")[0];
          newEndTime = `${endDatePart} ${newEndTime}`;
        }

        // Dikey sürükleme için masa değişikliği hesaplama
        if (tables && currentTableId) {
          const currentTableIndex = tables.findIndex(
            (t) => t.id === currentTableId
          );
          if (currentTableIndex !== -1) {
            const cellHeight = 30; // Her masanın yüksekliği
            const tableOffset = Math.round(deltaY / cellHeight);
            const targetTableIndex = currentTableIndex + tableOffset;

            if (targetTableIndex >= 0 && targetTableIndex < tables.length) {
              const newTableId = tables[targetTableIndex].id;
              setTargetTableId(newTableId);
              draggedReservation.tableId = newTableId;
            }
          }
        }

        draggedReservation.startTime = newStartTime;
        draggedReservation.endTime = newEndTime;

        setDraggedReservation({ ...draggedReservation });
      };

      const handleGlobalMouseUp = () => {
        if (!isDragging) {
          // Hiç sürükleme olmadıysa, bu bir tıklama olayıdır
          onReservationClick(reservation);
          return;
        }

        // Sürükleme olduysa ama hareket azsa, tıklama olarak değerlendir
        if (!hasMoved) {
          onReservationClick(reservation);
          setIsDragging(false);
          setDragStartPos(null);
          setDraggedReservation(null);
          setHasMoved(false);
          return;
        }

        // Normal sürükleme işlemi
        if (!draggedReservation || !dragStartPos) {
          setIsDragging(false);
          setDragStartPos(null);
          setDraggedReservation(null);
          setHasMoved(false);
          return;
        }

        const hasTimeChanged =
          initialStartTime !== draggedReservation.startTime ||
          initialEndTime !== draggedReservation.endTime;

        // Masa değişimi oldu mu kontrol et
        const hasTableChanged = initialTableId !== draggedReservation.tableId;

        const hasConflict = hasTableConflict(
          draggedReservation.tableId,
          draggedReservation.startTime,
          draggedReservation.endTime,
          draggedReservation.id
        );

        if (hasConflict) {
          toast.error("Bu masa ve saatte çakışma var!");
          setIsDragging(false);
          setDragStartPos(null);
          setDraggedReservation(null);
          setHasMoved(false);
          setTargetTableId(null);
          return;
        }

        const originalReservation = { ...reservation };
        if (hasTimeChanged || hasTableChanged) {
          setPendingUpdate({
            updated: { ...draggedReservation },
            original: originalReservation,
          });
          setShowModal(true);
        }

        setIsDragging(false);
        setDragStartPos(null);
        setDraggedReservation(null);
        setHasMoved(false);
        setTargetTableId(null);
      };

      document.addEventListener("mousemove", handleGlobalMouseMove);
      document.addEventListener("mouseup", handleGlobalMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleGlobalMouseMove);
        document.removeEventListener("mouseup", handleGlobalMouseUp);
      };
    }
  }, [
    isDragging,
    draggedReservation,
    dragStartPos,
    initialStartTime,
    initialEndTime,
    initialTableId,
    cellWidth,
    hasTableConflict,
    reservation,
    tables,
    currentTableId,
  ]);

  // Modal onaylandığında
  const handleConfirm = () => {
    if (pendingUpdate) {
      onReservationUpdate(pendingUpdate.updated, pendingUpdate.original);
      toast.success("Rezervasyon güncellendi!");
    }
    setShowModal(false);
    setPendingUpdate(null);
  };

  // Modal iptal edildiğinde
  const handleCancel = () => {
    setShowModal(false);
    setPendingUpdate(null);
    toast("İşlem iptal edildi");
  };

  // Kartın stil ve renklerini hesapla
  const getCardStyle = () => {
    // Geçmiş rezervasyonlar her zaman siyah olmalı (Bu kontrol önemli)
    if (isPastReservation) {
      return {
        backgroundColor: "#111827", // gray-900 - siyah
        borderLeft: `4px solid ${categoryBorderColor}`,
        color: "#FFFFFF", // Yazı rengini her zaman beyaz yap
        opacity: 0.85, // Geçmiş rezervasyonları biraz soluk göster
      };
    }

    // Eğer belirli bir renk belirlenmişse
    if (reservationColor) {
      return {
        backgroundColor: reservationColor,
        borderLeft: `4px solid ${categoryBorderColor}`,
        color: "#FFFFFF", // Yazı rengini her zaman beyaz yap
      };
    }

    // Varsayılan durumda kategori rengini kullan
    return {
      backgroundColor: reservation.color || categoryColor,
      borderLeft: `4px solid ${categoryBorderColor}`,
      color: "#FFFFFF", // Yazı rengini her zaman beyaz yap
    };
  };

  // Rezervasyon süresini hesapla
  const getDuration = () => {
    const startMinutes = convertTimeToMinutes(reservation.startTime);
    const endMinutes = convertTimeToMinutes(reservation.endTime);
    const durationMinutes = endMinutes - startMinutes;
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    if (hours > 0) {
      return `${hours}s ${minutes}d`;
    }
    return `${minutes}d`;
  };

  // Başlangıç saatini formatla
  const getStartTime = () => {
    const timeOnly = reservation.startTime.includes("T")
      ? reservation.startTime.split("T")[1].substring(0, 5)
      : reservation.startTime.includes(" ")
      ? reservation.startTime.split(" ")[1].substring(0, 5)
      : reservation.startTime;
    return timeOnly;
  };

  // --- TOUCH EVENTS FOR MOBILE ---
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isReservationPast && isReservationPast(reservation.startTime)) return;
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    setTouchDragging(true);
    setTouchDraggedReservation({ ...reservation });
    setInitialStartTime(reservation.startTime);
    setInitialEndTime(reservation.endTime);
    setInitialTableId(reservation.tableId);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchDragging || !touchDraggedReservation || !touchStartPos) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartPos.x;
    const deltaY = touch.clientY - touchStartPos.y;
    // Masaüstüyle aynı mantık: Yatayda saat, dikeyde masa değişimi
    // Ancak mobilde gerçek drag yerine, uzun sürüklemede modal açılacak
    if (Math.abs(deltaX) > 30 || Math.abs(deltaY) > 30) {
      setShowMobileActionModal(true);
      setTouchDragging(false);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchDragging) {
      // Tıklama gibi davran: kartı seç
      setShowMobileActionModal(true);
      setMobileActionType(null);
      return;
    }
    setTouchDragging(false);
    setTouchStartPos(null);
    setTouchDraggedReservation(null);
  };

  // Mobilde modalda "Taşı" veya "Süreyi Değiştir" seçilirse grid modalı aç
  const handleMobileAction = (action: "move" | "resize") => {
    setMobileActionType(action);
    setShowMobileActionModal(false);
    setShowMobileGridModal(true);
    setMobileGridAction(action);
  };

  // Mobil gridde hücre seçilince rezervasyonu güncelle
  const handleMobileGridCellClick = (tableId: string, time: string) => {
    if (!touchDraggedReservation) return;
    let updated = { ...touchDraggedReservation };
    if (mobileGridAction === "move") {
      updated.tableId = tableId;
      updated.startTime = time;
      // Süreyi koru
      const duration =
        convertTimeToMinutes(touchDraggedReservation.endTime) -
        convertTimeToMinutes(touchDraggedReservation.startTime);
      updated.endTime = convertMinutesToTime(
        convertTimeToMinutes(time) + duration
      );
    } else if (mobileGridAction === "resize") {
      // Sadece bitiş saatini değiştir
      updated.endTime = time;
    }
    onReservationUpdate(updated, touchDraggedReservation);
    setShowMobileGridModal(false);
    setTouchDraggedReservation(null);
    setMobileGridAction(null);
  };

  return (
    <>
      <div
        ref={cardRef}
        id={`reservation-${reservation.id}`}
        className={`absolute rounded-lg pointer-events-auto overflow-hidden shadow-lg hover:shadow-xl transition-all duration-200 reservation-card ${
          isDragging
            ? "cursor-grabbing z-50 scale-105"
            : isPastReservation
            ? "cursor-pointer z-5 opacity-85"
            : "cursor-grab z-5 hover:scale-102"
        }`}
        style={{
          left: position.left,
          width: position.width,
          top: "2px",
          height: `calc(${cellHeight}px - 4px)`,
          ...getCardStyle(),
          minWidth: "100px",
          touchAction: "none",
          backdropFilter: "blur(4px)",
          boxShadow: isDragging
            ? "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)"
            : "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        }}
        data-reservation-id={reservation.id}
        data-table-id={reservation.tableId}
        data-time={`${reservation.startTime}-${reservation.endTime}`}
        data-past={isPastReservation.toString()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Modern gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent pointer-events-none" />

        {/* Ana içerik */}
        <div className="relative z-10 h-full flex flex-col justify-center px-3 py-1 reservation-content">
          {cellHeight < 60 ? (
            // Kompakt gösterim (60px'den küçük)
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-white/80 flex-shrink-0" />
                <div className="font-semibold text-white text-xs truncate">
                  {reservation.customerName
                    .split(" ")
                    .map((word) => word.charAt(0).toUpperCase())
                    .join("")}
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <span className="bg-white/20 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-white font-medium">
                  {reservation.guestCount}
                </span>
                {isPastReservation && (
                  <span className="bg-red-500/80 px-1 py-0.5 rounded text-[8px] text-white font-medium">
                    Geçmiş
                  </span>
                )}
              </div>
            </div>
          ) : (
            // Normal gösterim (60px ve üzeri)
            <div className="space-y-1">
              {/* Müşteri adı ve durum */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-white/80 flex-shrink-0" />
                  <div className="font-semibold text-white text-sm truncate">
                    {reservation.customerName}
                  </div>
                </div>
                {isPastReservation && (
                  <span className="bg-red-500/80 px-1.5 py-0.5 rounded text-[10px] text-white font-medium">
                    Geçmiş
                  </span>
                )}
              </div>

              {/* Alt bilgiler */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded text-white font-medium">
                    {reservation.guestCount} kişi
                  </span>
                  <span className="text-white/80 font-medium">
                    {getStartTime()}
                  </span>
                </div>
                <span className="text-white/70 text-[10px] font-medium">
                  {getDuration()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Sürükleme göstergesi */}
        {!isPastReservation && (
          <div className="absolute top-1 right-1 w-2 h-2 bg-white/30 rounded-full pointer-events-none" />
        )}

        {/* Resize handle'ları */}
        {!isPastReservation && onResizeStart && (
          <>
            {/* Sol resize handle (başlangıç zamanı) */}
            <div
              className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 transition-colors"
              onMouseDown={(e) => {
                e.stopPropagation();
                onResizeStart(e, reservation.id, "start");
              }}
              title="Başlangıç zamanını değiştir"
            />

            {/* Sağ resize handle (bitiş zamanı) */}
            <div
              className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 transition-colors"
              onMouseDown={(e) => {
                e.stopPropagation();
                onResizeStart(e, reservation.id, "end");
              }}
              title="Bitiş zamanını değiştir"
            />
          </>
        )}
      </div>
      {/* Mobilde kart seçilince aksiyon modalı */}
      {showMobileActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl p-6 w-80 flex flex-col items-center">
            <div className="font-bold text-lg mb-4">Rezervasyon İşlemi</div>
            <button
              className="w-full py-2 mb-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={() => handleMobileAction("move")}
            >
              Taşı (Masa/Saat Değiştir)
            </button>
            <button
              className="w-full py-2 mb-2 bg-green-600 text-white rounded hover:bg-green-700"
              onClick={() => handleMobileAction("resize")}
            >
              Süreyi Değiştir
            </button>
            <button
              className="w-full py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              onClick={() => setShowMobileActionModal(false)}
            >
              İptal
            </button>
          </div>
        </div>
      )}
      {/* Mobilde masa/saat seçimi için grid modalı */}
      {showMobileGridModal && tables && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl p-4 w-full max-w-lg flex flex-col items-center">
            <div className="font-bold text-lg mb-4">
              {mobileGridAction === "move"
                ? "Masa ve Saat Seç"
                : "Bitiş Saati Seç"}
            </div>
            <div className="overflow-x-auto w-full">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 border">Masa</th>
                    {timeSlots.map((time) => (
                      <th key={time} className="p-2 border text-xs">
                        {time}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tables.map((table) => (
                    <tr key={table.id}>
                      <td className="p-2 border font-bold">{table.number}</td>
                      {timeSlots.map((time) => (
                        <td
                          key={time}
                          className="p-1 border text-xs cursor-pointer hover:bg-blue-100"
                          onClick={() =>
                            handleMobileGridCellClick(table.id, time)
                          }
                        >
                          {time}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              className="mt-4 w-full py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              onClick={() => setShowMobileGridModal(false)}
            >
              İptal
            </button>
          </div>
        </div>
      )}
      <ReservationConfirmModal
        open={showModal}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        reservation={pendingUpdate?.updated}
        original={pendingUpdate?.original}
      />
    </>
  );
};

export default DraggableReservationCard;
