"use client";

import { useState, useEffect, useRef } from "react";
import { format, addDays, subDays, isToday } from "date-fns";
import { tr } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

interface DatePickerProps {
  onDateChange: (date: Date) => void;
  initialDate?: Date;
}

export default function DatePicker({
  onDateChange,
  initialDate = new Date(),
}: DatePickerProps) {
  const [selected, setSelected] = useState<Date>(initialDate);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Component mount olduğunda seçili tarihi callback ile bildir
    onDateChange(selected);
  }, [onDateChange, selected]);

  // Dışarı tıklandığında takvimi kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setIsCalendarOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleDaySelect = (day: Date | undefined) => {
    if (day) {
      setSelected(day);
      onDateChange(day);
      setIsCalendarOpen(false);
    }
  };

  const goToNextDay = () => {
    const nextDay = addDays(selected, 1);
    setSelected(nextDay);
    onDateChange(nextDay);
  };

  const goToPreviousDay = () => {
    const prevDay = subDays(selected, 1);
    setSelected(prevDay);
    onDateChange(prevDay);
  };

  const goToToday = () => {
    const today = new Date();
    setSelected(today);
    onDateChange(today);
  };

  const toggleCalendar = () => {
    setIsCalendarOpen(!isCalendarOpen);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={goToPreviousDay}
          className="p-2 rounded-full hover:bg-gray-100"
          aria-label="Önceki gün"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className="relative" ref={calendarRef}>
          <div
            onClick={toggleCalendar}
            className={`px-4 py-2 border rounded-md flex items-center gap-2 cursor-pointer hover:bg-gray-50 ${
              isToday(selected) ? "bg-blue-50 border-blue-300" : ""
            }`}
          >
            <span className="text-sm font-medium">
              {format(selected, "d MMMM yyyy, EEEE", { locale: tr })}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>

          {isCalendarOpen && (
            <div className="absolute z-10 mt-2 bg-white shadow-lg rounded-lg p-2 border">
              <DayPicker
                mode="single"
                selected={selected}
                onSelect={handleDaySelect}
                locale={tr}
                classNames={{
                  day_selected: "bg-blue-600 text-white rounded-md",
                  day_today: "border border-blue-500 rounded-md",
                  button: "hover:bg-blue-100 rounded-md",
                }}
                footer={
                  <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between">
                    <button
                      onClick={() => handleDaySelect(new Date())}
                      className="text-sm text-blue-600 hover:text-blue-800"
                      type="button"
                    >
                      Bugün
                    </button>
                    <button
                      onClick={() => setIsCalendarOpen(false)}
                      className="text-sm text-gray-600 hover:text-gray-800"
                      type="button"
                    >
                      Kapat
                    </button>
                  </div>
                }
              />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={goToNextDay}
          className="p-2 rounded-full hover:bg-gray-100"
          aria-label="Sonraki gün"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        <button
          type="button"
          onClick={goToToday}
          className="ml-2 px-3 py-1 text-sm border rounded-md hover:bg-gray-100"
        >
          Bugün
        </button>
      </div>
    </div>
  );
}
