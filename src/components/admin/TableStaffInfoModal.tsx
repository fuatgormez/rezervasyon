"use client";

import { X, User, Clock, Calendar, Users, Edit2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useState } from "react";
import { db } from "@/lib/firebase/config";
import { ref, set, get } from "firebase/database";
import toast from "react-hot-toast";

interface TableStaffInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: string;
  tableNumber: number;
  assignment: any;
  waitersData: any[];
  selectedDate: Date;
  restaurantId: string;
  onUpdate?: () => void;
}

export default function TableStaffInfoModal({
  isOpen,
  onClose,
  tableId,
  tableNumber,
  assignment,
  waitersData,
  selectedDate,
  restaurantId,
  onUpdate,
}: TableStaffInfoModalProps) {
  if (!isOpen) return null;

  // State for editing
  const [isEditingShift, setIsEditingShift] = useState(false);
  const [editingWaiterShift, setEditingWaiterShift] = useState<string | null>(
    null
  );
  const [editingBusboyShift, setEditingBusboyShift] = useState<string | null>(
    null
  );
  const [saving, setSaving] = useState(false);

  // Helper functions
  const getWaiterInfo = (waiterId: string) => {
    return waitersData.find((w) => w.id === waiterId);
  };

  const getShiftName = (shift: string) => {
    switch (shift) {
      case "morning":
        return "Sabah";
      case "evening":
        return "Akşam";
      case "all_day":
        return "Tüm Gün";
      default:
        return shift;
    }
  };

  // Vardiya düzenleme fonksiyonları
  const startEditingShift = () => {
    console.log("🔧 Starting edit shift mode", {
      currentShift: assignment?.shift,
      waiter: waiter?.name,
      busboy: busboy?.name,
    });
    setIsEditingShift(true);
    setEditingWaiterShift(assignment?.shift || "morning");
    setEditingBusboyShift(assignment?.shift || "morning");
  };

  const cancelEditingShift = () => {
    setIsEditingShift(false);
    setEditingWaiterShift(null);
    setEditingBusboyShift(null);
  };

  const saveShiftChanges = async () => {
    if (!assignment || !restaurantId) return;

    setSaving(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const assignmentRef = ref(
        db,
        `assignments/${restaurantId}/${dateStr}/${tableId}`
      );

      // Mevcut atamayı al
      const currentSnapshot = await get(assignmentRef);
      const currentAssignment = currentSnapshot.exists()
        ? currentSnapshot.val()
        : {};

      // Yeni vardiya bilgilerini hesapla
      let newShift = assignment.shift;

      // Eğer hem garson hem komi aynı vardiyada çalışacaksa, o vardiyayı kullan
      if (editingWaiterShift === editingBusboyShift) {
        newShift = editingWaiterShift;
      } else {
        // Farklı vardiyalar seçilmişse, garsonun vardiyasını öncelik ver
        newShift = editingWaiterShift;
      }

      const updatedAssignment = {
        ...currentAssignment,
        shift: newShift,
        assignedAt: new Date().toISOString(),
      };

      await set(assignmentRef, updatedAssignment);

      toast.success("Vardiya başarıyla güncellendi");
      setIsEditingShift(false);
      onUpdate?.(); // Parent component'i güncelle
    } catch (error) {
      console.error("Vardiya güncelleme hatası:", error);
      toast.error("Vardiya güncellenirken hata oluştu");
    }
    setSaving(false);
  };

  // Garson ve komi için geçerli vardiyaları getir
  const getValidShifts = (position: "waiter" | "busboy") => {
    // Hem garson hem komi tüm vardiyalarda çalışabilir
    return [
      { value: "morning", label: "Sabah" },
      { value: "evening", label: "Akşam" },
      { value: "all_day", label: "Tüm Gün" },
    ];
  };

  const waiter = assignment?.waiterId
    ? getWaiterInfo(assignment.waiterId)
    : null;
  const busboy = assignment?.buserId ? getWaiterInfo(assignment.buserId) : null;

  // Debug console log
  console.log("🔧 TableStaffInfoModal render", {
    isEditingShift,
    assignment,
    waiter: waiter?.name,
    busboy: busboy?.name,
    editingWaiterShift,
    editingBusboyShift,
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Masa {tableNumber} - Personel Bilgileri
              </h2>
              <p className="text-sm text-gray-600">
                {format(selectedDate, "d MMMM yyyy", { locale: tr })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!assignment ? (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">
                Bu masaya henüz personel atanmamış
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Vardiya Bilgisi */}
              {assignment.shift && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <div>
                        <h3 className="font-medium text-blue-900">Vardiya</h3>
                        {!isEditingShift ? (
                          <p className="text-blue-700">
                            {getShiftName(assignment.shift)}
                          </p>
                        ) : (
                          <div className="space-y-3 mt-2">
                            {/* Garson Vardiya Seçimi */}
                            {waiter && (
                              <div>
                                <label className="block text-xs font-medium text-blue-800 mb-1">
                                  👨‍💼 Garson Vardiyası
                                </label>
                                <select
                                  value={editingWaiterShift || "morning"}
                                  onChange={(e) =>
                                    setEditingWaiterShift(e.target.value)
                                  }
                                  className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                  {getValidShifts("waiter").map((shift) => (
                                    <option
                                      key={shift.value}
                                      value={shift.value}
                                    >
                                      {shift.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* Komi Vardiya Seçimi */}
                            {busboy && (
                              <div>
                                <label className="block text-xs font-medium text-blue-800 mb-1">
                                  🧑‍🍳 Komi Vardiyası
                                </label>
                                <select
                                  value={editingBusboyShift || "morning"}
                                  onChange={(e) =>
                                    setEditingBusboyShift(e.target.value)
                                  }
                                  className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                  {getValidShifts("busboy").map((shift) => (
                                    <option
                                      key={shift.value}
                                      value={shift.value}
                                    >
                                      {shift.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* Uyarı Mesajı */}
                            {editingWaiterShift !== editingBusboyShift &&
                              waiter &&
                              busboy && (
                                <div className="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                                  ⚠️ Farklı vardiyalar seçildi. Garsonun
                                  vardiyası öncelikli olacak.
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Düzenleme Butonları */}
                    {!isEditingShift ? (
                      <button
                        onClick={() => {
                          console.log("🔧 Edit button clicked!");
                          startEditingShift();
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-200 rounded-lg transition-colors border border-blue-300 bg-white shadow-sm"
                        title="Vardiyayı düzenle"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    ) : (
                      <div className="flex space-x-1">
                        <button
                          onClick={saveShiftChanges}
                          disabled={saving}
                          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          {saving ? "..." : "Kaydet"}
                        </button>
                        <button
                          onClick={cancelEditingShift}
                          disabled={saving}
                          className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 transition-colors"
                        >
                          İptal
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Garson Bilgisi */}
              {waiter && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium">👨‍💼</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">Garson</h3>
                      <p className="text-lg font-semibold text-gray-800">
                        {waiter.name}
                      </p>
                      {waiter.phone && (
                        <p className="text-sm text-gray-600 mt-1">
                          📞 {waiter.phone}
                        </p>
                      )}
                      {waiter.email && (
                        <p className="text-sm text-gray-600">
                          📧 {waiter.email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Komi Bilgisi */}
              {busboy && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="text-orange-600 font-medium">🧑‍🍳</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">Komi</h3>
                      <p className="text-lg font-semibold text-gray-800">
                        {busboy.name}
                      </p>
                      {busboy.phone && (
                        <p className="text-sm text-gray-600 mt-1">
                          📞 {busboy.phone}
                        </p>
                      )}
                      {busboy.email && (
                        <p className="text-sm text-gray-600">
                          📧 {busboy.email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Atama Bilgisi */}
              {assignment.assignedAt && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    <div>
                      <h3 className="font-medium text-gray-900">
                        Atama Tarihi
                      </h3>
                      <p className="text-gray-700">
                        {format(
                          new Date(assignment.assignedAt),
                          "d MMMM yyyy HH:mm",
                          {
                            locale: tr,
                          }
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Atanmamış Pozisyonlar Uyarısı */}
              {(!waiter || !busboy) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-medium text-yellow-800 mb-2">
                    Eksik Atamalar
                  </h3>
                  <div className="space-y-1">
                    {!waiter && (
                      <p className="text-sm text-yellow-700">
                        • Garson atanmamış
                      </p>
                    )}
                    {!busboy && (
                      <p className="text-sm text-yellow-700">
                        • Komi atanmamış
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
