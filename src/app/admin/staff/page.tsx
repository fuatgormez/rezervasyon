"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// Garson türü tanımı
interface Staff {
  id: string;
  name: string;
  phone: string;
  email: string;
  position: string;
  startDate: string;
  isActive: boolean;
}

export default function StaffManagementPage() {
  // Garsonlar için state
  const [staff, setStaff] = useState<Staff[]>([
    {
      id: "1",
      name: "Ahmet Yılmaz",
      phone: "+90 555 111 22 33",
      email: "ahmet@example.com",
      position: "Garson",
      startDate: "2023-01-15",
      isActive: true,
    },
    {
      id: "2",
      name: "Ayşe Kaya",
      phone: "+90 555 222 33 44",
      email: "ayse@example.com",
      position: "Kıdemli Garson",
      startDate: "2022-05-10",
      isActive: true,
    },
    {
      id: "3",
      name: "Mehmet Demir",
      phone: "+90 555 333 44 55",
      email: "mehmet@example.com",
      position: "Şef Garson",
      startDate: "2021-11-20",
      isActive: true,
    },
  ]);

  // Seçilen garson ve form state'i
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<Staff, "id">>({
    name: "",
    phone: "",
    email: "",
    position: "Garson",
    startDate: new Date().toISOString().split("T")[0],
    isActive: true,
  });

  // LocalStorage'dan veri yükleme
  useEffect(() => {
    const savedStaff = localStorage.getItem("staff");
    if (savedStaff) {
      setStaff(JSON.parse(savedStaff));
    }
  }, []);

  // Garson ekleme fonksiyonu
  const addStaff = () => {
    const newStaff: Staff = {
      id: Date.now().toString(),
      ...formData,
    };

    const updatedStaff = [...staff, newStaff];
    setStaff(updatedStaff);
    localStorage.setItem("staff", JSON.stringify(updatedStaff));

    resetForm();
  };

  // Garson güncelleme fonksiyonu
  const updateStaff = () => {
    if (!selectedStaff) return;

    const updatedStaff = staff.map((s) =>
      s.id === selectedStaff.id ? { ...s, ...formData } : s
    );

    setStaff(updatedStaff);
    localStorage.setItem("staff", JSON.stringify(updatedStaff));

    resetForm();
  };

  // Garson silme fonksiyonu
  const deleteStaff = (id: string) => {
    const updatedStaff = staff.filter((s) => s.id !== id);
    setStaff(updatedStaff);
    localStorage.setItem("staff", JSON.stringify(updatedStaff));
  };

  // Form sıfırlama fonksiyonu
  const resetForm = () => {
    setSelectedStaff(null);
    setIsFormOpen(false);
    setFormData({
      name: "",
      phone: "",
      email: "",
      position: "Garson",
      startDate: new Date().toISOString().split("T")[0],
      isActive: true,
    });
  };

  // Düzenleme fonksiyonu
  const handleEdit = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setFormData({
      name: staffMember.name,
      phone: staffMember.phone,
      email: staffMember.email,
      position: staffMember.position,
      startDate: staffMember.startDate,
      isActive: staffMember.isActive,
    });
    setIsFormOpen(true);
  };

  // Form input değişikliklerini yakalama
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    setFormData({
      ...formData,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    });
  };

  // Form gönderme
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStaff) {
      updateStaff();
    } else {
      addStaff();
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Garson Yönetimi</h1>
        <div className="space-x-2">
          <button
            onClick={() => setIsFormOpen(true)}
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            Yeni Garson Ekle
          </button>
          <Link
            href="/admin"
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Admin Paneline Dön
          </Link>
        </div>
      </div>

      {/* Garson Listesi */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Garson Listesi</h2>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ad Soyad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Telefon
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  E-posta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pozisyon
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Başlangıç Tarihi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {staff.map((staffMember) => (
                <tr key={staffMember.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {staffMember.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {staffMember.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {staffMember.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {staffMember.position}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {staffMember.startDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        staffMember.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {staffMember.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap space-x-2">
                    <button
                      onClick={() => handleEdit(staffMember)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => deleteStaff(staffMember.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Garson Ekleme/Düzenleme Formu */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-2xl">
            <h2 className="text-xl font-semibold mb-4">
              {selectedStaff ? "Garson Düzenle" : "Yeni Garson Ekle"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Ad Soyad
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Telefon
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    E-posta
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Pozisyon
                  </label>
                  <select
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  >
                    <option value="Garson">Garson</option>
                    <option value="Kıdemli Garson">Kıdemli Garson</option>
                    <option value="Şef Garson">Şef Garson</option>
                    <option value="Müdür Yardımcısı">Müdür Yardımcısı</option>
                    <option value="Müdür">Müdür</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Başlangıç Tarihi
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>

                <div className="flex items-center h-full">
                  <label className="inline-flex items-center mt-6">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                      className="form-checkbox h-5 w-5 text-blue-600"
                    />
                    <span className="ml-2 text-gray-700">Aktif</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                  {selectedStaff ? "Güncelle" : "Ekle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
