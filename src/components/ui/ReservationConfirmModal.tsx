import React, { useEffect } from "react";

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

interface ReservationConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  reservation?: ReservationType | null;
  original?: ReservationType | null;
}

const ReservationConfirmModal: React.FC<ReservationConfirmModalProps> = ({
  open,
  onConfirm,
  onCancel,
  reservation,
  original,
}) => {
  // Keyboard event listener'ları
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onConfirm();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };

    // Event listener'ı ekle
    document.addEventListener("keydown", handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onConfirm, onCancel]);

  if (!open) return null;

  const formatTime = (time: string) => {
    if (time.includes("T")) {
      return time.split("T")[1].substring(0, 5);
    } else if (time.includes(" ")) {
      return time.split(" ")[1].substring(0, 5);
    }
    return time;
  };

  const hasChanges = () => {
    if (!reservation || !original) return false;

    return (
      reservation.startTime !== original.startTime ||
      reservation.endTime !== original.endTime ||
      reservation.tableId !== original.tableId
    );
  };

  const getChangeDescription = () => {
    if (!reservation || !original) return "";

    const changes = [];

    if (reservation.startTime !== original.startTime) {
      changes.push(
        `Başlangıç: ${formatTime(original.startTime)} → ${formatTime(
          reservation.startTime
        )}`
      );
    }

    if (reservation.endTime !== original.endTime) {
      changes.push(
        `Bitiş: ${formatTime(original.endTime)} → ${formatTime(
          reservation.endTime
        )}`
      );
    }

    if (reservation.tableId !== original.tableId) {
      changes.push(`Masa: ${original.tableId} → ${reservation.tableId}`);
    }

    return changes.join(", ");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Rezervasyon Güncelleme
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {reservation && (
          <div className="mb-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">
                {reservation.customerName}
              </h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Kişi sayısı: {reservation.guestCount}</div>
                <div>Başlangıç: {formatTime(reservation.startTime)}</div>
                <div>Bitiş: {formatTime(reservation.endTime)}</div>
                <div>Masa: {reservation.tableId}</div>
              </div>
            </div>
          </div>
        )}

        {hasChanges() && (
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Değişiklikler:</h4>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">{getChangeDescription()}</p>
            </div>
          </div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            İptal (Esc)
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            Onayla (Enter)
          </button>
        </div>

        {/* Kısayol tuşları bilgisi */}
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-500">
            💡 <strong>Enter</strong> ile onayla, <strong>Esc</strong> ile iptal
            et
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReservationConfirmModal;
