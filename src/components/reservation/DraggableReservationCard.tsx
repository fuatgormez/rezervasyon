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
  reservationColor?: string;
  reservationStatuses?: Record<string, "arrived" | "departed" | null>;
  isReservationPast?: (startTime: string) => boolean;
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
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedReservation, setDraggedReservation] =
    useState<ReservationType | null>(null);
  const [initialStartTime, setInitialStartTime] = useState("");
  const [initialEndTime, setInitialEndTime] = useState("");
  const [initialTableId, setInitialTableId] = useState("");

  // --- YENİ: Zaman dilimi uzatma/kısaltma için ---
  const [resizeDir, setResizeDir] = useState<null | "left" | "right">(null);
  const [resizeStartX, setResizeStartX] = useState<number | null>(null);
  const [resizeStartWidth, setResizeStartWidth] = useState<number | null>(null);
  const [resizeStartLeft, setResizeStartLeft] = useState<number | null>(null);
  const [resizeStartTime, setResizeStartTime] = useState<string>("");
  const [resizeEndTime, setResizeEndTime] = useState<string>("");
  // left ve width state olarak tutulacak
  const [leftPx, setLeftPx] = useState<number>(parseInt(position.left));
  const [widthPx, setWidthPx] = useState<number>(parseInt(position.width));
  // Son adım indexini tut (her adımda bir kez güncelleme için)
  const [lastStep, setLastStep] = useState<number>(0);

  useEffect(() => {
    setLeftPx(parseInt(position.left));
    setWidthPx(parseInt(position.width));
  }, [position.left, position.width]);

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

    // Elementin altındaki masa ID'sini bul - farklı yöntemleri deneyelim
    const elementsAtPoint = document.elementsFromPoint(clientX, clientY);

    // Masa ID'sini bulmaya çalışalım
    let foundTableId = false;

    // 1. Yöntem: Doğrudan data-table-id özniteliği olan elementi bul
    for (const element of elementsAtPoint) {
      const tableId = element.getAttribute("data-table-id");
      if (tableId) {
        draggedReservation.tableId = tableId;
        foundTableId = true;
        break;
      }
    }

    // 2. Yöntem: Eğer bulunamadıysa, üst elementleri kontrol et
    if (!foundTableId) {
      for (const element of elementsAtPoint) {
        const parent = element.parentElement;
        if (parent) {
          const parentTableId = parent.getAttribute("data-table-id");
          if (parentTableId) {
            draggedReservation.tableId = parentTableId;
            foundTableId = true;
            break;
          }
        }
      }
    }

    // Zaman hesaplama - sürükleme mesafesine göre zaman güncelleme
    const cellWidthMinutes = 60;
    const minuteStep = 15;
    let minuteOffsetRaw = (offsetX / cellWidth) * cellWidthMinutes;
    let minuteOffset = Math.round(minuteOffsetRaw / minuteStep) * minuteStep;

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

    // Masa değişimi oldu mu kontrol et
    const hasMasaChanged = initialTableId !== draggedReservation.tableId;

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

    if (hasMasaChanged) {
      // Masa değişimi varsa onay al
      const userConfirm = window.confirm(
        `Rezervasyonu yeni masaya taşımak istediğinize emin misiniz?`
      );

      if (userConfirm) {
        // Çakışma yoksa güncelleyelim
        onReservationUpdate(draggedReservation);
        toast.success("Rezervasyon başarıyla taşındı!");
      } else {
        // Onay verilmezse işlemi iptal et
        toast("Taşıma işlemi iptal edildi");
      }
    } else {
      // Masa değişimi yoksa direkt güncelle
      onReservationUpdate(draggedReservation);
      toast.success("Rezervasyon başarıyla taşındı!");
    }

    setIsDragging(false);
    setDraggedReservation(null);
  };

  // Mouse hareketi ile kartı uzat/kısalt
  useEffect(() => {
    if (!resizeDir) return;
    function onMouseMove(e: MouseEvent) {
      if (resizeStartX === null || resizeStartWidth === null) return;
      const cellWidthMinutes = 60;
      const minuteStep = 15;
      const pxPerStep = cellWidth * (minuteStep / cellWidthMinutes); // 15 dakikalık adımın px karşılığı
      let diffX = e.clientX - resizeStartX;
      let step = Math.round(diffX / pxPerStep);
      if (step === lastStep) return; // Aynı adımda kalıyorsak güncelleme yapma
      setLastStep(step);
      let newWidth = resizeStartWidth;
      let newLeft = leftPx;
      let newStart = resizeStartTime;
      let newEnd = resizeEndTime;
      if (resizeDir === "left") {
        // Sola çekince (step negatif): sola uzama, sağa çekince (step pozitif): sağa daralma
        newWidth = resizeStartWidth - step * pxPerStep;
        newLeft = (resizeStartLeft ?? leftPx) + step * pxPerStep;
        // Minimum genişlik kontrolü
        if (newWidth < cellWidth) {
          // Sağdan daralma sınırı
          newLeft += newWidth - cellWidth; // left'i sağa kaydır
          newWidth = cellWidth;
          step = Math.floor((resizeStartWidth - cellWidth) / pxPerStep);
        }
        // Saat güncelle
        const startMins =
          convertTimeToMinutes(resizeStartTime) + step * minuteStep;
        newStart = convertMinutesToTime(startMins);
      } else if (resizeDir === "right") {
        newWidth = resizeStartWidth + step * pxPerStep;
        if (newWidth < cellWidth) {
          newWidth = cellWidth;
          step = Math.floor((cellWidth - resizeStartWidth) / pxPerStep);
        }
        newLeft = leftPx;
        // Saat güncelle
        const endMins = convertTimeToMinutes(resizeEndTime) + step * minuteStep;
        newEnd = convertMinutesToTime(endMins);
      }
      setWidthPx(newWidth);
      setLeftPx(newLeft);
      setDraggedReservation((r) =>
        r ? { ...r, startTime: newStart, endTime: newEnd } : null
      );
      // Hemen güncelle (senkron)
      if (draggedReservation) {
        const updated = {
          ...draggedReservation,
          startTime: newStart,
          endTime: newEnd,
        };
        const startTime = convertTimeToMinutes(updated.startTime);
        const endTime = convertTimeToMinutes(updated.endTime);
        if (endTime > startTime) {
          const hasConflict = hasTableConflict(
            updated.tableId,
            updated.startTime,
            updated.endTime,
            updated.id
          );
          if (!hasConflict) {
            onReservationUpdate(updated);
          }
        }
      }
    }
    function onMouseUp() {
      setResizeDir(null);
      setDraggedReservation(null);
      setLastStep(0);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [
    resizeDir,
    resizeStartX,
    resizeStartWidth,
    resizeStartLeft,
    resizeStartTime,
    resizeEndTime,
    draggedReservation,
    cellWidth,
    leftPx,
    lastStep,
  ]);

  // Kartın stil ve renklerini hesapla
  const getCardStyle = () => {
    // Eğer renk bilgisi geldiyse direkt onu kullan
    const bgColor = reservationColor || reservation.color || categoryColor;

    return {
      backgroundColor: bgColor,
      borderLeft: `4px solid ${categoryBorderColor}`,
      color: "#FFFFFF", // Yazı rengini her zaman beyaz yap
    };
  };

  return (
    <Draggable
      defaultClassName="reservation-draggable"
      defaultClassNameDragging="reservation-dragging"
      onStart={handleDragStart}
      onDrag={handleDrag}
      onStop={handleDragStop}
      position={{ x: 0, y: 0 }}
      grid={[cellWidth / 4, cellHeight]}
      cancel=".resize-handle"
    >
      <div
        id={`reservation-${reservation.id}`}
        className={`absolute rounded-md pointer-events-auto flex items-center overflow-visible shadow-md hover:shadow-lg transition-all duration-200 ${
          isDragging ? "cursor-grabbing z-50" : "cursor-grab z-5"
        }`}
        style={{
          left: resizeDir ? `${leftPx}px` : position.left,
          width: resizeDir ? `${widthPx}px` : position.width,
          top: "1px",
          height: `calc(${cellHeight}px - 2px)`,
          ...getCardStyle(),
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
        <div
          className="resize-handle absolute left-0 top-0 h-full w-4 cursor-ew-resize hover:bg-white hover:bg-opacity-20 z-10"
          onMouseDown={(e) => {
            e.stopPropagation();
            setResizeDir("left");
            setResizeStartX(e.clientX);
            setResizeStartWidth(widthPx);
            setResizeStartLeft(leftPx);
            setResizeStartTime(reservation.startTime);
            setResizeEndTime(reservation.endTime);
            setDraggedReservation({ ...reservation });
          }}
        ></div>

        <div className="px-3 py-0 text-xs truncate max-w-full text-white h-full flex flex-col justify-center">
          {cellHeight < 50 ? (
            // Yükseklik 50px'den küçükse yan yana gösterim
            <div className="flex items-center justify-between">
              <div className="font-semibold whitespace-nowrap overflow-hidden text-ellipsis text-white">
                {reservation.customerName
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase())
                  .join("")}
              </div>
              <div className="text-white text-[11px] flex items-center ml-2">
                <span className="mr-1">
                  {draggedReservation?.startTime || reservation.startTime}
                </span>
                <span className="bg-white bg-opacity-30 px-1 rounded text-[10px] text-white">
                  {reservation.guestCount}
                </span>
              </div>
            </div>
          ) : (
            // Normal gösterim (50px ve üzeri)
            <>
              <div className="font-semibold whitespace-nowrap overflow-hidden text-ellipsis text-white">
                {reservation.customerName}
              </div>
              <div className="text-white text-[11px] flex items-center mt-1">
                <span className="mr-1">
                  {draggedReservation?.startTime || reservation.startTime}-
                  {draggedReservation?.endTime || reservation.endTime}
                </span>
                <span className="bg-white bg-opacity-30 px-1 rounded text-[10px] text-white">
                  {reservation.guestCount} kişi
                </span>
              </div>
            </>
          )}
        </div>

        {/* Sağ tutamaç - Genişletme işlemi için */}
        <div
          className="resize-handle absolute right-0 top-0 h-full w-4 cursor-ew-resize hover:bg-white hover:bg-opacity-20 z-10"
          onMouseDown={(e) => {
            e.stopPropagation();
            setResizeDir("right");
            setResizeStartX(e.clientX);
            setResizeStartWidth(widthPx);
            setResizeStartLeft(leftPx);
            setResizeStartTime(reservation.startTime);
            setResizeEndTime(reservation.endTime);
            setDraggedReservation({ ...reservation });
          }}
        ></div>
      </div>
    </Draggable>
  );
};

export default DraggableReservationCard;
