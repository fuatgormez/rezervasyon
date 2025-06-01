import React, { useState, useEffect, useCallback, useRef } from "react";
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

  // Sürüklemeye başladığında
  const handleDragStart = (e: DraggableEvent, data: DraggableData) => {
    // Geçmiş rezervasyonların taşınmasını engelle
    if (isPastReservation) {
      e.stopPropagation();
      e.preventDefault();
      return false;
    }

    // Yeni sürükleme işlemi için olay önizlemesini engelle
    e.stopPropagation();

    // Dokunmatik olaylar için daha iyi destek
    if ("touches" in e) {
      document.body.style.overflow = "hidden"; // Sayfanın kaydırılmasını engelle
    }

    // Sürükleme durumunu güncelle
    setIsDragging(true);
    setDraggedReservation({ ...reservation });

    // Başlangıç değerlerini kaydet
    setInitialStartTime(reservation.startTime);
    setInitialEndTime(reservation.endTime);
    setInitialTableId(reservation.tableId);

    // DraggableEventHandler sadece false veya void döndürebilir
    return;
  };

  // Sürükleme sırasında
  const handleDrag = (e: DraggableEvent, data: DraggableData) => {
    if (!draggedReservation) return;

    // Mevcut pozisyonu güncelle
    const offsetX = data.x;

    // e.clientX ve e.clientY değerlerini düzgün şekilde al (MouseEvent veya TouchEvent olabilir)
    let clientX: number;
    let clientY: number;

    // Touch olaylarını daha iyi yakala (mobil cihazlar için)
    if ("touches" in e && e.touches.length > 0) {
      // TouchEvent durumu - mobil için
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      // İlave olarak, sayfanın kaydırılmasını engelle
      e.preventDefault();
    } else if ("changedTouches" in e && e.changedTouches.length > 0) {
      // TouchEvent - touchend olayı için
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      // MouseEvent durumu - masaüstü için
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    // Mevcut fare konumunun altındaki elementleri bul
    const elementsAtPoint = document.elementsFromPoint(clientX, clientY);

    // Doğrudan masa ID'si olan elementi bul veya yakındaki bir elementi bul
    for (let i = 0; i < elementsAtPoint.length; i++) {
      const element = elementsAtPoint[i];
      const tableId = element.getAttribute("data-table-id");

      if (tableId) {
        draggedReservation.tableId = tableId;
        break;
      }

      // Eğer direkt elementi bulamazsak, üst elemente bak
      const parent = element.closest("[data-table-id]");
      if (parent) {
        const parentTableId = parent.getAttribute("data-table-id");
        if (parentTableId) {
          draggedReservation.tableId = parentTableId;
          break;
        }
      }
    }

    // Zaman hesaplama - sürükleme mesafesine göre zaman güncelleme
    const cellWidthMinutes = 60;
    const minuteStep = 15; // 15 dakikalık adımlarla hareket edilecek
    let minuteOffsetRaw = (offsetX / cellWidth) * cellWidthMinutes;
    let minuteOffset = Math.round(minuteOffsetRaw / minuteStep) * minuteStep;

    // Yeni başlangıç ve bitiş zamanlarını hesapla
    try {
      const startMinutes = convertTimeToMinutes(initialStartTime);
      const endMinutes = convertTimeToMinutes(initialEndTime);
      const duration = endMinutes - startMinutes;

      const newStartMinutes = startMinutes + minuteOffset;
      const newEndMinutes = newStartMinutes + duration;

      // Yeni zamanları ayarla
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

      draggedReservation.startTime = newStartTime;
      draggedReservation.endTime = newEndTime;

      // Sürükleme sırasında sürekli güncelle
      setDraggedReservation({ ...draggedReservation });
    } catch (error) {
      console.error("Zaman dönüşümü hatası:", error);
    }
  };

  // Sürükleme tamamlandığında
  const handleDragStop = (e: DraggableEvent, data: DraggableData) => {
    if (!draggedReservation) {
      setIsDragging(false);
      return;
    }

    // Mobil için overflow'u eski haline getir
    document.body.style.overflow = "";

    // Masa değişimi oldu mu kontrol et
    const hasMasaChanged = initialTableId !== draggedReservation.tableId;

    // Zaman değişimi oldu mu kontrol et
    const hasTimeChanged =
      initialStartTime !== draggedReservation.startTime ||
      initialEndTime !== draggedReservation.endTime;

    // Sürükleme mesafesi çok az ise tıklama olarak değerlendir ve güncelleme yapma
    const dx = Math.abs(data.x);
    const dy = Math.abs(data.y);
    if (dx < 5 && dy < 5) {
      setIsDragging(false);
      setDraggedReservation(null);
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

    // Orijinal rezervasyon bilgilerini kopyala (eski durum)
    const originalReservation = { ...reservation };

    // Masa değişimi olmasa bile mutlaka güncelleme yap
    // Böylece zaman değişiklikleri de kaydedilir
    if (hasMasaChanged && !hasTimeChanged) {
      // Sadece masa değişikliği - onay gerektirmez
      if (!draggedReservation.tableId) {
        draggedReservation.tableId = initialTableId;
        toast.error("Masa bilgisi bulunamadı, orijinal masa korunuyor");
      }

      // Direkt olarak güncelle, onay kutusu gösterme
      onReservationUpdate({ ...draggedReservation }, originalReservation);
      toast.success("Rezervasyon başarıyla taşındı!");

      // Temizlik
      setIsDragging(false);
      setDraggedReservation(null);
    } else if (hasTimeChanged) {
      // Saat değişikliği var, onay gerekir
      if (showConfirmation) {
        // Zamanları okunaklı formata çevirelim
        const formatTimeForDisplay = (timeStr: string): string => {
          if (timeStr.includes("T")) {
            return timeStr.split("T")[1].substring(0, 5);
          } else if (timeStr.includes(" ")) {
            return timeStr.split(" ")[1].substring(0, 5);
          }
          return timeStr;
        };

        const oldTimeDisplay = `${formatTimeForDisplay(
          initialStartTime
        )} - ${formatTimeForDisplay(initialEndTime)}`;
        const newTimeDisplay = `${formatTimeForDisplay(
          draggedReservation.startTime
        )} - ${formatTimeForDisplay(draggedReservation.endTime)}`;

        // Onay popup'ı göster
        showConfirmation(
          "Rezervasyon Zamanı Değiştirilecek",
          `<strong>${draggedReservation.customerName}</strong> isimli müşterinin rezervasyon zamanını değiştirmek istediğinize emin misiniz?<br/><br/>
          <div style="text-align: left; padding: 10px; background: #f8f9fa; border-radius: 5px; margin-bottom: 10px;">
            <div><strong>Eski Zaman:</strong> ${oldTimeDisplay}</div>
            <div><strong>Yeni Zaman:</strong> ${newTimeDisplay}</div>
            <div><strong>Masa:</strong> ${draggedReservation.tableId}</div>
            <div><strong>Kişi Sayısı:</strong> ${draggedReservation.guestCount}</div>
          </div>`,
          () => {
            console.log(
              "DraggableReservationCard -> Onay fonksiyonu çalıştırılıyor"
            );
            console.log(
              "Rezervasyon:",
              draggedReservation.id,
              draggedReservation.customerName
            );
            console.log(
              "Güncellenen zaman:",
              draggedReservation.startTime,
              draggedReservation.endTime
            );

            try {
              // Onaylandı, güncelleme yap
              onReservationUpdate(
                { ...draggedReservation },
                originalReservation
              );
              toast.success("Rezervasyon zamanı güncellendi!");
            } catch (error) {
              console.error("Rezervasyon güncellenirken hata:", error);
              toast.error("Rezervasyon güncellenirken bir hata oluştu");
            } finally {
              // Temizlik
              setIsDragging(false);
              setDraggedReservation(null);
            }
          },
          () => {
            console.log(
              "DraggableReservationCard -> İptal fonksiyonu çalıştırılıyor"
            );

            try {
              // İptal edildi, orijinal duruma geri dön
              toast.success("İşlem iptal edildi");
            } catch (error) {
              console.error("İptal işlemi sırasında hata:", error);
            } finally {
              // Temizlik
              setIsDragging(false);
              setDraggedReservation(null);
            }
          }
        );
      } else {
        // Onay popup'ı yoksa direkt güncelle
        onReservationUpdate({ ...draggedReservation }, originalReservation);
        toast.success("Rezervasyon zamanları güncellendi!");

        // Temizlik
        setIsDragging(false);
        setDraggedReservation(null);
      }
    } else {
      // Başka değişiklik yoksa, güncelleme yapma
      setIsDragging(false);
      setDraggedReservation(null);
    }
  };

  // Mouse hareketi ile kartı uzat/kısalt
  useEffect(() => {
    if (!resizeDir) return;
    function onMouseMove(e: MouseEvent) {
      if (resizeStartX === null || resizeStartWidth === null) return;
      const cellWidthMinutes = 60;
      const minuteStep = 15; // 15 dakikalık adımlarla hareket edilecek
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
        // Saat güncelle - 15 dakikalık adımlar
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
        // Saat güncelle - 15 dakikalık adımlar
        const endMins = convertTimeToMinutes(resizeEndTime) + step * minuteStep;
        newEnd = convertMinutesToTime(endMins);
      }
      setWidthPx(newWidth);
      setLeftPx(newLeft);
      setDraggedReservation((r) =>
        r ? { ...r, startTime: newStart, endTime: newEnd } : null
      );

      // Hemen güncelle (senkron) - resize işlemleri için onay gerekmez
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
            // Orijinal rezervasyon kopyasını oluştur
            const originalReservation = { ...reservation };

            // Güncellemeyi yap - resize için onay gerekmez
            onReservationUpdate(updated, originalReservation);
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

  return (
    <Draggable
      defaultClassName="reservation-draggable"
      defaultClassNameDragging="reservation-dragging"
      onStart={handleDragStart}
      onDrag={handleDrag}
      onStop={handleDragStop}
      position={{ x: 0, y: 0 }}
      grid={[cellWidth / 4, cellHeight]}
      cancel={isPastReservation ? ".reservation-card" : ".resize-handle"}
      disabled={isPastReservation} // Geçmiş rezervasyonların taşınmasını devre dışı bırak
      enableUserSelectHack={false} // Mobil cihazlarda sürükleme sorununu çözer
      scale={1} // Tam ölçek (zoom durumunda bile doğru çalışması için)
    >
      <div
        id={`reservation-${reservation.id}`}
        className={`absolute rounded-md pointer-events-auto flex items-center overflow-visible shadow-md hover:shadow-lg transition-all duration-100 reservation-card ${
          isDragging
            ? "cursor-grabbing z-50"
            : isPastReservation
            ? "cursor-pointer z-5"
            : "cursor-grab z-5"
        }`}
        style={{
          left: resizeDir ? `${leftPx}px` : position.left,
          width: resizeDir ? `${widthPx}px` : position.width,
          top: "1px",
          height: `calc(${cellHeight}px - 2px)`,
          ...getCardStyle(),
          minWidth: "80px",
          touchAction: "none", // Mobil cihazlarda dokunmatik olayların önceliğini sürüklemeye ver
        }}
        data-reservation-id={reservation.id}
        data-table-id={reservation.tableId}
        data-time={`${reservation.startTime}-${reservation.endTime}`}
        data-past={isPastReservation.toString()}
        onClick={(e) => {
          if (!isDragging) {
            e.stopPropagation();
            // Sidebar'ı sadece tıklama ile aç, hover özelliğini kaldırdık
            onReservationClick(reservation);
          }
        }}
      >
        {/* Sol tutamaç - Genişletme işlemi için - sadece geçmiş olmayan rezervasyonlarda göster */}
        {!isPastReservation && (
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
        )}

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
                {isPastReservation && (
                  <span className="ml-1 text-[10px] text-white bg-red-600 px-1 rounded-sm">
                    Geçmiş
                  </span>
                )}
              </div>
              <div className="text-white text-[11px] flex items-center mt-1">
                <span className="bg-white bg-opacity-30 px-1 rounded text-[10px] text-white">
                  {reservation.guestCount} kişi
                </span>
              </div>
            </>
          )}
        </div>

        {/* Sağ tutamaç - Genişletme işlemi için - sadece geçmiş olmayan rezervasyonlarda göster */}
        {!isPastReservation && (
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
        )}
      </div>
    </Draggable>
  );
};

export default DraggableReservationCard;
