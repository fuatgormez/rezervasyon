import React, { useState, useEffect } from "react";

interface StaffMember {
  id: string;
  name: string;
  position: string;
}

interface StaffAssignmentFormProps {
  staff: StaffMember[];
  selectedTables: string[];
  onAssign: (staffIds: string[]) => void;
  onCancel: () => void;
  initialSelectedStaff: string[];
}

const StaffAssignmentForm: React.FC<StaffAssignmentFormProps> = ({
  staff,
  selectedTables,
  onAssign,
  onCancel,
  initialSelectedStaff,
}) => {
  // State'i initial değerden başlat
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([
    ...initialSelectedStaff,
  ]);

  // initialSelectedStaff değiştiğinde state'i güncelle
  useEffect(() => {
    console.log("initialSelectedStaff değişti:", initialSelectedStaff);
    // Yeni bir array oluştur ki referans değişsin
    setSelectedStaffIds([...initialSelectedStaff]);
  }, [initialSelectedStaff]);

  // Personel seçimini değiştirir (checkbox'a tıklandığında)
  const handleStaffToggle = (
    e: React.MouseEvent | React.ChangeEvent,
    staffId: string
  ) => {
    // Olayın yukarı propagasyonunu durdur
    if (e && "stopPropagation" in e) {
      e.stopPropagation();
    }

    // Seçimi güncelle
    setSelectedStaffIds((prev) => {
      // Seçili mi kontrol et
      const isSelected = prev.includes(staffId);

      // Önceki duruma dayalı olarak güncelle
      let newSelections;
      if (isSelected) {
        // Bu ID'yi çıkar
        newSelections = prev.filter((id) => id !== staffId);
      } else {
        // Bu ID'yi ekle
        newSelections = [...prev, staffId];
      }

      // Yeni seçimleri logla
      console.log("Seçilen garsonlar:", newSelections);
      return newSelections;
    });
  };

  // Personel seçimi değişikliğini uygular
  const handleAssign = (e: React.MouseEvent) => {
    // Olayın yukarı propagasyonunu durdur
    e.stopPropagation();

    // Hiç garson seçilmediyse uyar
    if (selectedStaffIds.length === 0) {
      alert("Lütfen en az bir garson seçin");
      return;
    }

    // Atama işlemini çağır
    console.log("handleAssign çağrıldı, seçilen garsonlar:", selectedStaffIds);
    onAssign([...selectedStaffIds]); // Seçilen garsonların bir kopyasını gönder
  };

  // Modal kapama işlemi
  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCancel();
  };

  return (
    <div className="bg-white rounded p-2" onClick={(e) => e.stopPropagation()}>
      <div className="mb-4">
        <div className="font-medium text-gray-700 mb-2">Garsonlar:</div>
        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded p-2">
          {staff.length > 0 ? (
            <div>
              {/* Seçilen garsonları göster */}
              <div className="mb-2 text-xs text-gray-500">
                Seçilenleri işaretleyin:
              </div>

              {staff.map((staffMember) => (
                <div
                  key={staffMember.id}
                  className="flex items-center py-1.5 hover:bg-gray-50 px-2 rounded mb-1"
                  onClick={(e) => handleStaffToggle(e, staffMember.id)}
                >
                  <input
                    type="checkbox"
                    id={`staff-${staffMember.id}`}
                    checked={selectedStaffIds.includes(staffMember.id)}
                    onChange={(e) => handleStaffToggle(e, staffMember.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <label
                    htmlFor={`staff-${staffMember.id}`}
                    className="ml-2 flex-1 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-sm font-medium">
                      {staffMember.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {staffMember.position}
                    </div>
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              Garson listesi boş
            </div>
          )}
        </div>
      </div>

      {/* Seçilen garsonları göster */}
      {selectedStaffIds.length > 0 && (
        <div className="mt-2 p-2 bg-blue-50 rounded">
          <div className="text-sm font-medium text-blue-700 mb-1">
            Seçilen garsonlar:
          </div>
          <div className="flex flex-wrap gap-1">
            {selectedStaffIds.map((id) => {
              const staffMember = staff.find((s) => s.id === id);
              return staffMember ? (
                <span
                  key={id}
                  className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full"
                >
                  {staffMember.name}
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end space-x-2">
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          İptal
        </button>
        <button
          type="button"
          onClick={handleAssign}
          className={`px-4 py-2 rounded ${
            selectedTables.length > 0 && selectedStaffIds.length > 0
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-blue-300 text-white cursor-not-allowed"
          }`}
          disabled={
            selectedTables.length === 0 || selectedStaffIds.length === 0
          }
        >
          {selectedTables.length > 1
            ? `${selectedTables.length} Masaya Ata`
            : "Masaya Ata"}
        </button>
      </div>
    </div>
  );
};

export default StaffAssignmentForm;
