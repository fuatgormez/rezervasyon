// src/components/admin/ReservationGrid.tsx
// Orijinal: RezervasyonPaneli.tsx'in masa ve rezervasyon grid kısmı
// Açıklama: Masaları ve üzerindeki rezervasyon kartlarını gösteren ana grid componenti. State ve eventler parent'tan props olarak alınır.

import React, { useMemo, useRef } from "react";
import { Reservation, Table, Category } from "@/types/admin";
import DraggableReservationCard from "@/components/reservation/DraggableReservationCard";
import CurrentTimeLine from "@/components/CurrentTimeLine";

interface ReservationGridProps {
  tables: Table[];
  categories: Category[];
  reservations: Reservation[];
  timeSlots: string[];
  activeCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  onReservationClick: (reservation: Reservation) => void;
  onReservationUpdate: (
    reservation: Reservation,
    oldReservation?: Reservation
  ) => void;
  onResizeStart: (
    e: React.MouseEvent,
    reservationId: string,
    direction: "start" | "end"
  ) => void;
  hasTableConflict: (
    tableId: string,
    startTime: string,
    endTime: string,
    excludeReservationId?: string
  ) => boolean;
  isReservationPast: (startTime: string) => boolean;
  onCellClick: (tableId: string, time: string) => void;
  onDragStart: (reservation: Reservation) => void;
  onDragOver: (e: React.DragEvent, tableId: string, time: string) => void;
  onDrop: (e: React.DragEvent, tableId: string, time: string) => void;
}

const ReservationGrid: React.FC<ReservationGridProps> = ({
  tables,
  categories,
  reservations,
  timeSlots,
  activeCategory,
  onCategoryChange,
  onReservationClick,
  onReservationUpdate,
  onResizeStart,
  hasTableConflict,
  isReservationPast,
  onCellClick,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);

  // Zaman işlemleri için yardımcı fonksiyonlar
  const getTimeInMinutes = (timeString: string) => {
    const [hours, minutes] = timeString.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const getReservationAtTime = (tableId: string, time: string) => {
    return reservations.find((reservation) => {
      if (reservation.tableId !== tableId) return false;

      const startMinutes = getTimeInMinutes(reservation.startTime);
      const endMinutes = getTimeInMinutes(reservation.endTime);
      const timeMinutes = getTimeInMinutes(time);

      return timeMinutes >= startMinutes && timeMinutes < endMinutes;
    });
  };

  const getReservationPosition = (reservation: Reservation) => {
    const startMinutes = getTimeInMinutes(reservation.startTime);
    const endMinutes = getTimeInMinutes(reservation.endTime);
    const duration = endMinutes - startMinutes;

    const startTime = getTimeInMinutes("09:00"); // Grid başlangıcı
    const left =
      ((getTimeInMinutes(reservation.startTime) - startTime) / 60) * 100; // % cinsinden
    const width = (duration / 60) * 100; // % cinsinden

    return {
      left: `${left}%`,
      width: `${width}%`,
    };
  };

  // Filtrelenmiş tablolar
  const displayedTables = useMemo(() => {
    if (activeCategory) {
      return tables.filter((table) => table.categoryId === activeCategory);
    }
    return tables;
  }, [tables, activeCategory]);

  const cellWidth = 60; // px
  const cellHeight = 40; // px

  if (tables.length === 0) {
    return (
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto p-4">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500 mb-4">Herhangi bir masa bulunamadı.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Kategori Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Masa Kategorileri
        </h3>
        <div className="space-y-2">
          <button
            onClick={() => onCategoryChange(null)}
            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
              activeCategory === null
                ? "bg-blue-100 text-blue-700 border border-blue-300"
                : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            Tüm Masalar ({tables.length})
          </button>
          {categories.map((category) => {
            const categoryTables = tables.filter(
              (table) => table.categoryId === category.id
            );
            return (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                  activeCategory === category.id
                    ? "bg-blue-100 text-blue-700 border border-blue-300"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span>{category.name}</span>
                </div>
                <span className="text-sm text-gray-500">
                  ({categoryTables.length})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ana Grid Alanı */}
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          {/* Masa durumu özeti */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Toplam Masa
              </h3>
              <p className="text-2xl font-bold">{displayedTables.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Onaylı Rezervasyon
              </h3>
              <p className="text-2xl font-bold">
                {reservations.filter((r) => r.status === "confirmed").length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Bekleyen Rezervasyon
              </h3>
              <p className="text-2xl font-bold">
                {reservations.filter((r) => r.status === "pending").length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                İptal Edilen
              </h3>
              <p className="text-2xl font-bold">
                {reservations.filter((r) => r.status === "cancelled").length}
              </p>
            </div>
          </div>

          {/* Rezervasyon Grid */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-max relative" ref={gridRef}>
                {/* Zaman başlıkları */}
                <div className="flex border-b border-gray-200 sticky top-0 bg-white z-10">
                  <div className="w-48 bg-gray-50 p-3 font-medium text-gray-700 border-r border-gray-200">
                    Masa
                  </div>
                  {timeSlots.map((time) => (
                    <div
                      key={time}
                      className="w-15 bg-gray-50 p-2 text-xs font-medium text-gray-600 border-r border-gray-200 text-center"
                      style={{ width: `${cellWidth}px` }}
                    >
                      {time}
                    </div>
                  ))}
                </div>

                {/* Current Time Line */}
                <CurrentTimeLine gridRef={gridRef} />

                {/* Masa satırları */}
                {displayedTables.map((table) => {
                  const category = categories.find(
                    (c) => c.id === table.categoryId
                  );
                  return (
                    <div
                      key={table.id}
                      className="flex border-b border-gray-200 hover:bg-gray-50"
                    >
                      {/* Masa bilgisi */}
                      <div className="w-48 p-3 border-r border-gray-200 flex items-center justify-between bg-white">
                        <div>
                          <div className="font-medium text-gray-900">
                            Masa {table.number}
                          </div>
                          <div className="text-sm text-gray-500">
                            {table.capacity} kişilik
                          </div>
                        </div>
                        {category && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                            title={category.name}
                          />
                        )}
                      </div>

                      {/* Zaman hücreleri */}
                      <div className="flex relative">
                        {timeSlots.map((time) => {
                          const reservation = getReservationAtTime(
                            table.id,
                            time
                          );
                          return (
                            <div
                              key={`${table.id}-${time}`}
                              className="border-r border-gray-200 relative cursor-pointer hover:bg-blue-50"
                              style={{
                                width: `${cellWidth}px`,
                                height: `${cellHeight}px`,
                              }}
                              onClick={() => onCellClick(table.id, time)}
                              onDragOver={(e) => onDragOver(e, table.id, time)}
                              onDrop={(e) => onDrop(e, table.id, time)}
                            >
                              {reservation &&
                                getTimeInMinutes(reservation.startTime) ===
                                  getTimeInMinutes(time) && (
                                  <DraggableReservationCard
                                    reservation={{
                                      id: reservation.id,
                                      tableId: reservation.tableId,
                                      customerName: reservation.customerName,
                                      guestCount: reservation.guestCount,
                                      startTime: reservation.startTime,
                                      endTime: reservation.endTime,
                                      status: reservation.status,
                                      note: reservation.note,
                                    }}
                                    cellWidth={cellWidth}
                                    cellHeight={cellHeight}
                                    position={getReservationPosition(
                                      reservation
                                    )}
                                    categoryColor={category?.color || "#3B82F6"}
                                    categoryBorderColor={
                                      category?.borderColor || "#1D4ED8"
                                    }
                                    tables={tables}
                                    currentTableId={table.id}
                                    timeSlots={timeSlots}
                                    onReservationClick={(reservationType) => {
                                      // ReservationType'ı Reservation'a dönüştür
                                      const fullReservation: Reservation = {
                                        ...reservationType,
                                        date: reservation.date,
                                      };
                                      onReservationClick(fullReservation);
                                    }}
                                    onReservationHover={() => {}}
                                    onReservationLeave={() => {}}
                                    onReservationUpdate={(
                                      reservationType,
                                      oldReservationType
                                    ) => {
                                      // ReservationType'ları Reservation'a dönüştür
                                      const fullReservation: Reservation = {
                                        ...reservationType,
                                        date: reservation.date,
                                      };
                                      const oldFullReservation =
                                        oldReservationType
                                          ? {
                                              ...oldReservationType,
                                              date: reservation.date,
                                            }
                                          : undefined;
                                      onReservationUpdate(
                                        fullReservation,
                                        oldFullReservation
                                      );
                                    }}
                                    hasTableConflict={hasTableConflict}
                                    isReservationPast={isReservationPast}
                                    onResizeStart={onResizeStart}
                                  />
                                )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationGrid;
