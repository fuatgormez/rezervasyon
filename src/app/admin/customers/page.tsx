"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import AdminHeader from "@/components/admin/AdminHeader";

// Müşteri türü tanımı
interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  visitCount: number;
  lastVisit: string | null;
  isVIP: boolean;
}

export default function CustomerManagementPage() {
  // Müşteriler için state
  const [customers, setCustomers] = useState<Customer[]>([
    {
      id: "1",
      name: "Ahmet Yılmaz",
      phone: "+90 555 111 22 33",
      email: "ahmet@example.com",
      notes: "Köşe masayı tercih eder",
      visitCount: 8,
      lastVisit: "2023-05-15",
      isVIP: true,
    },
    {
      id: "2",
      name: "Ayşe Kaya",
      phone: "+90 555 222 33 44",
      email: "ayse@example.com",
      notes: "Glutensiz menü",
      visitCount: 4,
      lastVisit: "2023-04-22",
      isVIP: false,
    },
    {
      id: "3",
      name: "Mehmet Demir",
      phone: "+90 555 333 44 55",
      email: "mehmet@example.com",
      notes: "Doğum günü: 15 Haziran",
      visitCount: 12,
      lastVisit: "2023-06-10",
      isVIP: true,
    },
    {
      id: "4",
      name: "Zeynep Çelik",
      phone: "+90 555 444 55 66",
      email: "zeynep@example.com",
      notes: "",
      visitCount: 2,
      lastVisit: "2023-03-05",
      isVIP: false,
    },
  ]);

  // Seçilen müşteri ve form state'i
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<
    Omit<Customer, "id" | "visitCount" | "lastVisit">
  >({
    name: "",
    phone: "",
    email: "",
    notes: "",
    isVIP: false,
  });

  // LocalStorage'dan veri yükleme
  useEffect(() => {
    const savedCustomers = localStorage.getItem("customers");
    if (savedCustomers) {
      setCustomers(JSON.parse(savedCustomers));
    }
  }, []);

  // Müşteri ekleme fonksiyonu
  const addCustomer = () => {
    const newCustomer: Customer = {
      id: Date.now().toString(),
      ...formData,
      visitCount: 0,
      lastVisit: null,
    };

    const updatedCustomers = [...customers, newCustomer];
    setCustomers(updatedCustomers);
    localStorage.setItem("customers", JSON.stringify(updatedCustomers));

    resetForm();
    toast.success("Yeni müşteri başarıyla eklendi!");
  };

  // Müşteri güncelleme fonksiyonu
  const updateCustomer = () => {
    if (!selectedCustomer) return;

    const updatedCustomers = customers.map((c) =>
      c.id === selectedCustomer.id
        ? {
            ...c,
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            notes: formData.notes,
            isVIP: formData.isVIP,
          }
        : c
    );

    setCustomers(updatedCustomers);
    localStorage.setItem("customers", JSON.stringify(updatedCustomers));

    resetForm();
    toast.success("Müşteri bilgileri güncellendi!");
  };

  // Müşteri silme fonksiyonu
  const deleteCustomer = (id: string) => {
    const updatedCustomers = customers.filter((c) => c.id !== id);
    setCustomers(updatedCustomers);
    localStorage.setItem("customers", JSON.stringify(updatedCustomers));
    toast.success("Müşteri kaydı silindi!");
  };

  // Form sıfırlama fonksiyonu
  const resetForm = () => {
    setSelectedCustomer(null);
    setIsFormOpen(false);
    setFormData({
      name: "",
      phone: "",
      email: "",
      notes: "",
      isVIP: false,
    });
  };

  // Düzenleme fonksiyonu
  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      notes: customer.notes,
      isVIP: customer.isVIP,
    });
    setIsFormOpen(true);
  };

  // Form input değişikliklerini yakalama
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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
    if (selectedCustomer) {
      updateCustomer();
    } else {
      addCustomer();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader
        title="👥 Müşteri Yönetimi"
        subtitle="Müşteri bilgilerini ve tercihlerini yönetin"
      >
        <div className="flex justify-end">
          <button
            onClick={() => setIsFormOpen(true)}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
          >
            Yeni Müşteri Ekle
          </button>
        </div>
      </AdminHeader>

      <div className="container mx-auto p-4">
        {/* Müşteri Listesi */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Müşteri Listesi</h2>

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
                    Ziyaret Sayısı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Son Ziyaret
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    VIP
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {customer.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {customer.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {customer.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {customer.visitCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {customer.lastVisit || "Henüz ziyaret yok"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {customer.isVIP ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          VIP
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          Normal
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap space-x-2">
                      <button
                        onClick={() => handleEdit(customer)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => deleteCustomer(customer.id)}
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

        {/* Müşteri Ekleme/Düzenleme Formu */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-2xl">
              <h2 className="text-xl font-semibold mb-4">
                {selectedCustomer ? "Müşteri Düzenle" : "Yeni Müşteri Ekle"}
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

                  <div className="flex items-center h-full">
                    <label className="inline-flex items-center mt-6">
                      <input
                        type="checkbox"
                        name="isVIP"
                        checked={formData.isVIP}
                        onChange={handleInputChange}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span className="ml-2 text-gray-700">VIP Müşteri</span>
                    </label>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Notlar
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
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
                    {selectedCustomer ? "Güncelle" : "Ekle"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
