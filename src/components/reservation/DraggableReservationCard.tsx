import React, { useState, useEffect, useCallback } from "react";
import Draggable, { DraggableData, DraggableEvent } from "react-draggable";
import toast from "react-hot-toast";

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
  onReservationUpdate: (reservation: ReservationType) => void;
  hasTableConflict: (
    tableId: string,
    startTime: string,
    endTime: string,
    excludeReservationId?: string
  ) => boolean;
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
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedReservation, setDraggedReservation] =
    useState<ReservationType | null>(null);
  const [initialStartTime, setInitialStartTime] = useState("");
  const [initialEndTime, setInitialEndTime] = useState("");
  const [initialTableId, setInitialTableId] = useState("");

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

  // Sürüklemeye başladığında
  const handleDragStart = (e: DraggableEvent, data: DraggableData) => {
    e.stopPropagation();
    setIsDragging(true);
    setDraggedReservation({ ...reservation });

    // Başlangıç değerlerini kaydet
    setInitialStartTime(reservation.startTime);
    setInitialEndTime(reservation.endTime);
    setInitialTableId(reservation.tableId);
  };

  // Sürükleme sırasında
  const handleDrag = (e: DraggableEvent, data: DraggableData) => {
    if (!draggedReservation) return;

    // Mevcut pozisyonu güncelle
    const offsetX = data.x;

    // e.clientX ve e.clientY değerlerini düzgün şekilde al (MouseEvent veya TouchEvent olabilir)
    let clientX: number;
    let clientY: number;

    if ("touches" in e) {
      // TouchEvent durumu
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      // MouseEvent durumu
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    // Elementin altındaki masa ID'sini bul
    const targetElement = document
      .elementFromPoint(clientX, clientY)
      ?.closest(".table-row") as HTMLElement;

    if (targetElement) {
      const tableId = targetElement.getAttribute("data-table-id");
      if (tableId) {
        draggedReservation.tableId = tableId;
      }
    }

    // Zaman hesaplama - sürükleme mesafesine göre zaman güncelleme
    const cellWidthMinutes = 60;
    const minuteOffset = Math.round((offsetX / cellWidth) * cellWidthMinutes);

    // Yeni başlangıç ve bitiş zamanlarını hesapla
    const startMinutes = convertTimeToMinutes(initialStartTime);
    const endMinutes = convertTimeToMinutes(initialEndTime);
    const duration = endMinutes - startMinutes;

    const newStartMinutes = startMinutes + minuteOffset;
    const newEndMinutes = newStartMinutes + duration;

    // Yeni zamanları ayarla
    draggedReservation.startTime = convertMinutesToTime(newStartMinutes);
    draggedReservation.endTime = convertMinutesToTime(newEndMinutes);

    setDraggedReservation({ ...draggedReservation });
  };

  // Sürükleme tamamlandığında
  const handleDragStop = (e: DraggableEvent, data: DraggableData) => {
    if (!draggedReservation) {
      setIsDragging(false);
      return;
    }

    // Çakışma kontrolü
    const hasConflict = hasTableConflict(
      draggedReservation.tableId,
      draggedReservation.startTime,
      draggedReservation.endTime,
      draggedReservation.id
    );

    if (hasConflict) {
      toast.error("Bu masa ve saatte çakışma var!");

      // Orijinal değerlere geri dön ve güncelleme yapma
      setIsDragging(false);
      setDraggedReservation(null);
      return;
    }

    // Çakışma yoksa güncelleyelim
    onReservationUpdate(draggedReservation);
    toast.success("Rezervasyon başarıyla taşındı!");

    setIsDragging(false);
    setDraggedReservation(null);
  };

  return (
    <Draggable
      defaultClassName="reservation-draggable"
      defaultClassNameDragging="reservation-dragging"
      onStart={handleDragStart}
      onDrag={handleDrag}
      onStop={handleDragStop}
      position={{ x: 0, y: 0 }}
      grid={[cellWidth / 4, cellHeight]} // Çeyrek saatlik adımlarla hareket etsin
      cancel=".resize-handle"
    >
      <div
        id={`reservation-${reservation.id}`}
        className={`absolute rounded-md pointer-events-auto flex items-center overflow-visible shadow-md hover:shadow-lg transition-all duration-200 ${
          isDragging ? "cursor-grabbing z-50" : "cursor-grab z-5"
        }`}
        style={{
          left: `calc(${position.left} + 1px)`,
          width: `calc(${position.width} - 2px)`,
          top: "1px",
          height: `calc(${cellHeight}px - 2px)`,
          backgroundColor: reservation.color || categoryColor,
          borderLeft: `4px solid ${categoryBorderColor}`,
          minWidth: "80px",
          opacity: isDragging ? 0.85 : 1,
        }}
        data-reservation-id={reservation.id}
        data-table-id={reservation.tableId}
        data-time={`${reservation.startTime}-${reservation.endTime}`}
        onMouseEnter={() => {
          if (!isDragging) {
            onReservationHover(reservation);
          }
        }}
        onMouseLeave={() => {
          if (!isDragging) {
            onReservationLeave();
          }
        }}
        onClick={(e) => {
          if (!isDragging) {
            e.stopPropagation();
            onReservationClick(reservation);
          }
        }}
      >
        {/* Sol tutamaç - Genişletme işlemi için */}
        <div className="resize-handle absolute left-0 top-0 h-full w-4 cursor-ew-resize hover:bg-white hover:bg-opacity-20 z-10"></div>

        <div className="px-3 py-0 text-xs truncate max-w-full text-white h-full flex flex-col justify-center">
          {cellHeight < 50 ? (
            // Yükseklik 50px'den küçükse yan yana gösterim
            <div className="flex items-center justify-between">
              <div className="font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
                {reservation.customerName
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase())
                  .join("")}
              </div>
              <div className="text-white text-opacity-95 text-[11px] flex items-center ml-2">
                <span className="mr-1">{reservation.startTime}</span>
                <span className="bg-white bg-opacity-30 px-1 rounded text-[10px]">
                  {reservation.guestCount}
                </span>
              </div>
            </div>
          ) : (
            // Normal gösterim (50px ve üzeri)
            <>
              <div className="font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
                {reservation.customerName}
              </div>
              <div className="text-white text-opacity-95 text-[11px] flex items-center mt-1">
                <span className="mr-1">
                  {reservation.startTime}-{reservation.endTime}
                </span>
                <span className="bg-white bg-opacity-30 px-1 rounded text-[10px]">
                  {reservation.guestCount} kişi
                </span>
              </div>
            </>
          )}
        </div>

        {/* Sağ tutamaç - Genişletme işlemi için */}
        <div className="resize-handle absolute right-0 top-0 h-full w-4 cursor-ew-resize hover:bg-white hover:bg-opacity-20 z-10"></div>
      </div>
    </Draggable>
  );
};

export default DraggableReservationCard;
