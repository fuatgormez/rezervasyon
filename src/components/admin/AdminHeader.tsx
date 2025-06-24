// src/components/admin/AdminHeader.tsx
// Orijinal: RezervasyonPaneli.tsx'in header kısmı
// Açıklama: Tarih, filtre, arama ve yeni rezervasyon butonunu içeren üst component.

import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  PlusCircle,
  RefreshCw,
  Search,
} from "lucide-react";
import React from "react";

interface AdminHeaderProps {
  selectedDate: Date;
  onGoToToday: () => void;
  onGoToPreviousDay: () => void;
  onGoToNextDay: () => void;
  onOpenNewReservation: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export default function AdminHeader({
  selectedDate,
  onGoToToday,
  onGoToPreviousDay,
  onGoToNextDay,
  onOpenNewReservation,
  searchTerm,
  onSearchChange,
}: AdminHeaderProps) {
  return (
    <div className="flex justify-between items-center p-4 bg-white border-b border-gray-200">
      <div className="flex items-center space-x-4">
        <button
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          onClick={onGoToToday}
        >
          <Calendar className="w-4 h-4" />
          <span>Bugün</span>
        </button>
        <div className="flex items-center space-x-2">
          <button
            aria-label="Önceki gün"
            className="p-2 rounded-lg hover:bg-gray-100"
            onClick={onGoToPreviousDay}
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="relative font-medium text-lg cursor-pointer">
            {/* Burada tarih gösterimi olacak */}
            {selectedDate.toLocaleDateString("tr-TR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </div>
          <button
            aria-label="Sonraki gün"
            className="p-2 rounded-lg hover:bg-gray-100"
            onClick={onGoToNextDay}
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <button className="p-2 rounded-lg hover:bg-gray-100 text-blue-600">
          <Filter className="w-5 h-5" />
        </button>
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Ara..."
            className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <button className="p-2 rounded-lg hover:bg-gray-100">
          <RefreshCw className="w-5 h-5 text-gray-600" />
        </button>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-1"
          onClick={onOpenNewReservation}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Yeni Rezervasyon</span>
        </button>
      </div>
    </div>
  );
}
