// src/components/admin/ReservationModal.tsx
// Orijinal: RezervasyonPaneli.tsx'in modal kısmı
// Açıklama: Rezervasyon ekleme ve düzenleme modalı. Form state ve eventler parent'tan props olarak alınır.

import React from "react";
import { X } from "lucide-react";
import { Reservation, Table } from "@/types/admin";

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingReservation: Reservation | null;
  formValues: {
    customerName: string;
    guestCount: number;
    startTime: string;
    endTime: string;
    tableId: string;
    status: "confirmed" | "pending" | "cancelled";
    note: string;
  };
  onFormChange: (field: string, value: any) => void;
  onSave: () => void;
  onDelete: () => void;
  tables: Table[];
  timeSlots: string[];
}

const ReservationModal: React.FC<ReservationModalProps> = ({
  isOpen,
  onClose,
  editingReservation,
  formValues,
  onFormChange,
  onSave,
  onDelete,
  tables,
  timeSlots,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {editingReservation ? "Rezervasyon Düzenle" : "Yeni Rezervasyon"}
          </h3>
          <button
            className="text-gray-400 hover:text-gray-500"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Müşteri Adı
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={formValues.customerName}
              onChange={(e) => onFormChange("customerName", e.target.value)}
              placeholder="Müşteri adı"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kişi Sayısı
              </label>
              <input
                type="number"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={formValues.guestCount}
                onChange={(e) =>
                  onFormChange("guestCount", parseInt(e.target.value) || 1)
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Masa
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={formValues.tableId}
                onChange={(e) => onFormChange("tableId", e.target.value)}
              >
                <option value="">Masa Seçin</option>
                {tables.map((table) => (
                  <option key={table.id} value={table.id}>
                    Masa {table.number} ({table.capacity} kişilik)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Başlangıç Saati
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={formValues.startTime}
                onChange={(e) => onFormChange("startTime", e.target.value)}
              >
                {timeSlots.map((time) => (
                  <option key={`start-${time}`} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bitiş Saati
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={formValues.endTime}
                onChange={(e) => onFormChange("endTime", e.target.value)}
              >
                {timeSlots.map((time) => (
                  <option key={`end-${time}`} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Durum
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={formValues.status}
              onChange={(e) => onFormChange("status", e.target.value)}
            >
              <option value="confirmed">Onaylandı</option>
              <option value="pending">Beklemede</option>
              <option value="cancelled">İptal Edildi</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Not
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={formValues.note}
              onChange={(e) => onFormChange("note", e.target.value)}
              rows={3}
              placeholder="Rezervasyon hakkında not ekleyin"
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end space-x-3">
          {editingReservation && (
            <button
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              onClick={onDelete}
            >
              Sil
            </button>
          )}
          <button
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            onClick={onClose}
          >
            İptal
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            onClick={onSave}
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReservationModal;
