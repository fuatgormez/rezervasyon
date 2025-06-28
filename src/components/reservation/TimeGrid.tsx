"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import CurrentTimeLine from "@/components/CurrentTimeLine";

interface TimeGridProps {
  date: Date;
  tables: any[];
  onCellClick: (time: string, tableId: string, tableName: string) => void;
  reservations: any[];
}

export default function TimeGrid({
  date,
  tables,
  onCellClick,
  reservations,
}: TimeGridProps) {
  const hourRange = Array.from({ length: 14 }, (_, i) => i + 9); // 09:00 - 22:00
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Rezervasyonların olduğu saat-masa hücrelerini belirle
  const getReservationForCell = (time: string, tableId: string) => {
    return reservations.find(
      (res) => res.time === time && res.table_id === tableId
    );
  };

  // Hücre arka plan rengini belirle
  const getCellStyle = (time: string, table: any) => {
    const reservation = getReservationForCell(time, table.id);
    const isAvailable = table.isAvailableForCustomers !== false;

    const isHovered = hoveredCell === `${time}-${table.id}`;
    const baseStyle =
      "transition-colors duration-150 h-12 border text-center relative";

    if (reservation) {
      return `${baseStyle} bg-blue-100 hover:bg-blue-200 cursor-pointer`;
    }

    if (!isAvailable) {
      return `${baseStyle} bg-gray-100 cursor-not-allowed opacity-60`;
    }

    return isHovered
      ? `${baseStyle} bg-green-50 hover:bg-green-100 cursor-pointer`
      : `${baseStyle} bg-white hover:bg-gray-50 cursor-pointer`;
  };

  // Saati biçimlendir
  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, "0")}:00`;
  };

  // Masa başlığını biçimlendir
  const formatTableHeader = (table: any) => {
    const capacity = table.maxCapacity || table.capacity || 4;
    const minCapacity = table.minCapacity || 1;
    const tableName = table.tableName ? ` - ${table.tableName}` : "";
    const isAvailable = table.isAvailableForCustomers !== false;

    return `Masa ${table.number}${tableName} (${minCapacity}-${capacity} kişi)${
      !isAvailable ? " 🔒" : ""
    }`;
  };

  // Başlık satırı oluştur
  const renderHeaderRow = () => {
    return (
      <tr className="bg-gray-50">
        <th className="py-2 px-3 border font-medium text-gray-500">Saat</th>
        {tables.map((table) => (
          <th
            key={table.id}
            className="py-2 px-3 border font-medium text-gray-500"
          >
            {formatTableHeader(table)}
          </th>
        ))}
      </tr>
    );
  };

  // Saat satırlarını oluştur
  const renderTimeRows = () => {
    return hourRange.map((hour) => {
      const timeStr = formatHour(hour);

      return (
        <tr key={hour}>
          <td className="py-1 px-3 border font-medium text-gray-500">
            {timeStr}
          </td>
          {tables.map((table) => (
            <td
              key={`${timeStr}-${table.id}`}
              className={getCellStyle(timeStr, table)}
              onClick={() => {
                // Eğer hücre rezerve edilmemişse ve masa müşterilere açıksa, onCellClick fonksiyonunu çağır
                if (
                  !getReservationForCell(timeStr, table.id) &&
                  table.isAvailableForCustomers !== false
                ) {
                  onCellClick(timeStr, table.id, formatTableHeader(table));
                } else if (table.isAvailableForCustomers === false) {
                  alert(
                    "Bu masa sadece yönetici panelinden rezerve edilebilir."
                  );
                }
              }}
              onMouseEnter={() => setHoveredCell(`${timeStr}-${table.id}`)}
              onMouseLeave={() => setHoveredCell(null)}
            >
              {getReservationForCell(timeStr, table.id) ? (
                <div className="absolute inset-0 flex items-center justify-center text-xs">
                  {getReservationForCell(timeStr, table.id)?.customer_name ||
                    "Rezerve"}
                </div>
              ) : null}
            </td>
          ))}
        </tr>
      );
    });
  };

  return (
    <div className="relative">
      <div ref={gridRef} className="grid grid-cols-24 gap-1 h-24 border">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>{renderHeaderRow()}</thead>
            <tbody>{renderTimeRows()}</tbody>
          </table>
        </div>
      </div>
      <CurrentTimeLine gridRef={gridRef} />
    </div>
  );
}
