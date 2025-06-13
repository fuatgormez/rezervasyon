"use client";

import { useEffect, useState, useRef } from "react";
import { format, isWithinInterval, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { Reservation } from "@/types/reservation";
import CurrentTimeLine from "./CurrentTimeLine";

interface TimeGridProps {
  date: Date;
  reservations: Reservation[];
  onTimeSelect: (time: string) => void;
  selectedTime?: string;
}

export default function TimeGrid({
  date,
  reservations,
  onTimeSelect,
  selectedTime,
}: TimeGridProps) {
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentLeft, setCurrentLeft] = useState<number>(0);
  const gridRef = useRef<HTMLDivElement>(null);

  // Saat dilimlerini oluştur
  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, "0");
    return `${hour}:00`;
  });

  // Şu anki saati güncelle
  useEffect(() => {
    const updateCurrentTime = () => {
      const now = new Date();
      const time = format(now, "HH:mm");
      setCurrentTime(time);

      // Pozisyonu hesapla (saat ve dakika bazında, yüzde olarak)
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const totalMinutes = hours * 60 + minutes;
      const leftPercent = (totalMinutes / (24 * 60)) * 100;
      setCurrentLeft(leftPercent);
    };

    updateCurrentTime();
    const interval = setInterval(updateCurrentTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Seçilen zamanın dolu olup olmadığını kontrol et
  const isTimeSlotReserved = (time: string) => {
    const [hours] = time.split(":").map(Number);
    const timeDate = new Date(date);
    timeDate.setHours(hours, 0, 0, 0);

    return reservations.some((reservation) => {
      const start = parseISO(reservation.start_time);
      const end = parseISO(reservation.end_time);
      return isWithinInterval(timeDate, { start, end });
    });
  };

  // Seçilen zamanın geçmişte olup olmadığını kontrol et
  const isTimeSlotPast = (time: string) => {
    const [hours] = time.split(":").map(Number);
    const timeDate = new Date(date);
    timeDate.setHours(hours, 0, 0, 0);

    return timeDate < new Date();
  };

  return (
    <div className="relative">
      <div ref={gridRef} className="grid grid-cols-24 gap-1">
        {timeSlots.map((time) => {
          const isReserved = isTimeSlotReserved(time);
          const isPast = isTimeSlotPast(time);
          const isSelected = selectedTime === time;

          return (
            <button
              key={time}
              onClick={() => onTimeSelect(time)}
              disabled={isReserved || isPast}
              className={`relative h-12 rounded-md text-sm font-medium transition-colors
                ${
                  isReserved
                    ? "bg-red-100 text-red-700 cursor-not-allowed"
                    : isPast
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : isSelected
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-700 hover:bg-indigo-50"
                }
                ${isSelected ? "ring-2 ring-indigo-500 ring-offset-2" : ""}
              `}
            >
              {format(parseISO(`2024-01-01T${time}`), "HH:mm", {
                locale: tr,
              })}
            </button>
          );
        })}
      </div>
      <CurrentTimeLine gridRef={gridRef} />
    </div>
  );
}
