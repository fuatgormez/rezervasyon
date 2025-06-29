"use client";

import { useState, useEffect } from "react";
import { useAuthContext } from "@/lib/firebase/context";
import { db } from "@/lib/firebase/config";
import { ref, get, set, push, remove, update } from "firebase/database";
import toast from "react-hot-toast";
import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";
import { Customer } from "@/types/user";
import WaiterManagementModal from "@/components/admin/WaiterManagementModal";
// XLSX will be imported dynamically

export default function SettingsPage() {
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);

  const [data, setData] = useState<any>({
    customers: [],
    companies: [],
    restaurants: [],
    categories: [],
    tables: [],
    waiters: [],
  });

  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState("");
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [showWaiterModal, setShowWaiterModal] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const collections = [
        "customers",
        "companies",
        "restaurants",
        "categories",
        "tables",
        "waiters",
      ];
      const promises = collections.map(async (collection) => {
        const snapshot = await get(ref(db, collection));
        if (snapshot.exists()) {
          const data = snapshot.val();
          return {
            [collection]: Object.entries(data).map(
              ([id, item]: [string, any]) => ({ id, ...item })
            ),
          };
        }
        return { [collection]: [] };
      });

      const results = await Promise.all(promises);
      const newData = results.reduce(
        (acc, result) => ({ ...acc, ...result }),
        {}
      );
      setData(newData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Veriler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const contextualFormData = { ...formData };

      if (modalType === "restaurants" && selectedCompany) {
        contextualFormData.companyId = selectedCompany.id;
      }

      if (
        (modalType === "tables" ||
          modalType === "waiters" ||
          modalType === "categories" ||
          modalType === "customers") &&
        selectedRestaurant
      ) {
        contextualFormData.restaurantId = selectedRestaurant.id;
      }

      // Masa için özel işlemler
      if (modalType === "tables") {
        // Default değerler
        if (!contextualFormData.minCapacity) {
          contextualFormData.minCapacity = 1;
        }
        if (!contextualFormData.maxCapacity) {
          contextualFormData.maxCapacity = contextualFormData.minCapacity || 4;
        }
        if (contextualFormData.isAvailableForCustomers === undefined) {
          contextualFormData.isAvailableForCustomers = true;
        }
        // Eski uyumluluk için capacity alanını da set et
        contextualFormData.capacity = contextualFormData.maxCapacity;
      }

      // Garson için özel işlemler
      if (modalType === "waiters") {
        // Position default değeri
        if (!contextualFormData.position) {
          contextualFormData.position = "waiter";
        }
        console.log(
          "🔧 Saving waiter with position:",
          contextualFormData.position
        );
      }

      if (editingItem) {
        await update(ref(db, `${modalType}/${editingItem.id}`), {
          ...contextualFormData,
          updatedAt: new Date().toISOString(),
        });
        toast.success("Güncellendi!");
      } else {
        const newRef = push(ref(db, modalType));
        await set(newRef, {
          ...contextualFormData,
          createdAt: new Date().toISOString(),
        });
        toast.success("Eklendi!");
      }

      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({});
      setModalType("");
      loadAllData();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Kaydetme hatası!");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (type: string, id: string) => {
    if (!confirm("Silmek istediğinizden emin misiniz?")) return;

    try {
      setLoading(true);
      await remove(ref(db, `${type}/${id}`));
      toast.success("Silindi!");
      loadAllData();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Silme hatası!");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type: string, item?: any) => {
    setModalType(type);
    setEditingItem(item);

    // Form data'yı hazırla
    let initialFormData = item || {};

    // Garson ekleme için default pozisyon
    if (type === "waiters" && !item) {
      initialFormData = {
        ...initialFormData,
        position: "waiter",
      };
    }

    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const handleCustomerImport = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedRestaurant) {
      toast.error("Önce bir restoran seçin!");
      return;
    }

    try {
      setLoading(true);
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const XLSX = await import("xlsx");
          const arrayBuffer = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(arrayBuffer, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          let importedCount = 0;
          let skippedCount = 0;
          let errorCount = 0;

          if (jsonData.length === 0) {
            toast.error("Excel dosyası boş veya okunamadı!");
            return;
          }

          toast(`📊 ${jsonData.length} satır işlenmeye başlandı...`);

          for (const row of jsonData as any[]) {
            try {
              // Excel'den gelen veriyi müşteri formatına çevir
              const customer = {
                name:
                  row["Ad"] ||
                  row["Name"] ||
                  row["İsim"] ||
                  row["Müşteri Adı"] ||
                  row["Customer"] ||
                  row["İsim Soyisim"] ||
                  "",
                email:
                  row["Email"] ||
                  row["E-posta"] ||
                  row["Mail"] ||
                  row["Email address"] ||
                  "",
                phone:
                  row["Telefon"] ||
                  row["Phone"] ||
                  row["Tel"] ||
                  row["Gsm"] ||
                  row["Mobile"] ||
                  row["Telephone number"] ||
                  "",
                notes:
                  row["Notlar"] ||
                  row["Notes"] ||
                  row["Not"] ||
                  row["Comments"] ||
                  row["Description"] ||
                  row["Açıklama"] ||
                  "",
                // Formitable özel alanları
                city: row["City"] || row["Şehir"] || "",
                address: row["Address"] || row["Adres"] || "",
                birthday: row["Birthday"] || row["Doğum Günü"] || "",
                company: row["Company name"] || row["Firma Adı"] || "",
                // Rezervasyon bilgileri
                lastVisit: row["Last updated"] || row["Son Güncelleme"] || "",
                visitCount:
                  parseInt(
                    row["Visit count"] || row["Ziyaret Sayısı"] || "0"
                  ) || 0,
                totalSpent:
                  parseFloat(
                    row["Total spent"] || row["Toplam Harcama"] || "0"
                  ) || 0,
                // Sistem alanları
                restaurantId: selectedRestaurant.id,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                reservationCount: parseInt(row["Visit count"] || "0") || 0,
                loyaltyPoints: Math.floor(
                  (parseFloat(row["Total spent"] || "0") || 0) / 10
                ), // Her 10 TL için 1 puan
              };

              // Boş isim kontrolü
              if (!customer.name || customer.name.trim() === "") {
                skippedCount++;
                continue;
              }

              // Aynı isim ve telefon kontrolü
              const existingCustomer = data.customers.find(
                (c: any) =>
                  c.restaurantId === selectedRestaurant.id &&
                  c.name === customer.name &&
                  customer.phone &&
                  c.phone === customer.phone
              );

              if (existingCustomer) {
                skippedCount++;
                continue;
              }

              // Firebase'e kaydet
              const newRef = push(ref(db, "customers"));
              await set(newRef, customer);
              importedCount++;
            } catch (error) {
              console.error("Row processing error:", error);
              errorCount++;
            }
          }

          // Verileri yenile
          await loadAllData();

          // Detaylı import raporu
          const totalProcessed = importedCount + skippedCount + errorCount;
          const successRate =
            totalProcessed > 0
              ? Math.round((importedCount / totalProcessed) * 100)
              : 0;

          toast.success(
            `🎉 Import Tamamlandı!\n\n📊 Toplam İşlenen: ${totalProcessed}\n✅ Başarılı: ${importedCount} (${successRate}%)\n⏭️ Atlandı: ${skippedCount} (duplikat/geçersiz)\n❌ Hata: ${errorCount}\n\n💡 Müşteriler "${selectedRestaurant.name}" restoranına eklendi`,
            { duration: 8000 }
          );
        } catch (error) {
          console.error("Import error:", error);
          toast.error("Excel dosyası işlenirken hata oluştu!");
        } finally {
          setLoading(false);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("File read error:", error);
      toast.error("Dosya okuma hatası!");
      setLoading(false);
    }

    // Input'u temizle
    event.target.value = "";
  };

  // Get filtered data
  const getFilteredRestaurants = () => {
    return selectedCompany
      ? data.restaurants.filter((r: any) => r.companyId === selectedCompany.id)
      : [];
  };

  const getFilteredData = (type: string) => {
    if (!selectedRestaurant) return [];

    switch (type) {
      case "customers":
        return data.customers.filter(
          (c: any) => c.restaurantId === selectedRestaurant.id
        );
      case "categories":
        return data.categories.filter(
          (c: any) => c.restaurantId === selectedRestaurant.id
        );
      case "tables":
        return data.tables.filter(
          (t: any) => t.restaurantId === selectedRestaurant.id
        );
      case "waiters":
        return data.waiters.filter(
          (w: any) => w.restaurantId === selectedRestaurant.id
        );
      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader
        title="⚙️ Sistem Ayarları"
        subtitle="Firma → Restoran → Alt Veriler mantığında yönetim"
      />

      <div className="p-2">
        <div className="w-full">
          {/* Breadcrumb */}
          <div className="bg-white rounded-lg shadow-sm mb-6 p-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span className="font-medium">Konum:</span>
              <button
                onClick={() => {
                  setSelectedCompany(null);
                  setSelectedRestaurant(null);
                }}
                className="text-blue-600 hover:underline"
              >
                Ana Sayfa
              </button>
              {selectedCompany && (
                <>
                  <span>→</span>
                  <span className="text-blue-600">{selectedCompany.name}</span>
                </>
              )}
              {selectedRestaurant && (
                <>
                  <span>→</span>
                  <span className="text-blue-600">
                    {selectedRestaurant.name}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Üst Panel - Firma ve Restoran Seçimi */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
            {/* Sol Panel - Firmalar */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  🏢 Firmalar
                </h2>
                <button
                  onClick={() => openModal("companies")}
                  className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm"
                >
                  + Ekle
                </button>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {data.companies.map((company: any) => (
                  <div
                    key={company.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedCompany?.id === company.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => {
                      setSelectedCompany(company);
                      setSelectedRestaurant(null);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {company.name}
                        </h3>
                        <p className="text-sm text-gray-500">{company.email}</p>
                        <p className="text-sm text-gray-500">{company.phone}</p>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal("companies", company);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete("companies", company.id);
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sağ Panel - Restoranlar */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  🍽️{" "}
                  {selectedCompany
                    ? `${selectedCompany.name} Restoranları`
                    : "Restoranlar"}
                </h2>
                {selectedCompany && (
                  <button
                    onClick={() => openModal("restaurants")}
                    className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm"
                  >
                    + Ekle
                  </button>
                )}
              </div>

              {!selectedCompany ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-6xl mb-4">🏢</div>
                  <div className="text-lg font-medium mb-2">Firma Seçin</div>
                  <div>Restoranları görmek için soldan bir firma seçin</div>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {getFilteredRestaurants().map((restaurant: any) => (
                    <div
                      key={restaurant.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedRestaurant?.id === restaurant.id
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setSelectedRestaurant(restaurant)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">
                            {restaurant.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {restaurant.address}
                          </p>
                          <p className="text-sm text-gray-500">
                            Kapasite: {restaurant.capacity}
                          </p>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openModal("restaurants", restaurant);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete("restaurants", restaurant.id);
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {getFilteredRestaurants().length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">🍽️</div>
                      <div>Bu firmada henüz restoran yok</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Alt Panel - Restoran Detayları (Geniş Kartlar) */}
          {selectedRestaurant && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                  📋 {selectedRestaurant.name} - Detay Yönetimi
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-3 w-full">
                  {/* Müşteriler Kartı */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200 min-h-[600px] flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center space-x-2">
                        <div className="text-3xl">👥</div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Müşteriler
                          </h3>
                          <p className="text-sm text-gray-600">
                            {getFilteredData("customers").length} kayıt
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <div className="flex flex-col space-y-1">
                          <label
                            className={`${
                              loading
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-green-600 hover:bg-green-700 cursor-pointer"
                            } text-white px-3 py-1 rounded-lg text-sm`}
                          >
                            {loading ? "⏳ İşleniyor..." : "📥 Import"}
                            <input
                              type="file"
                              accept=".xlsx,.xls,.csv"
                              onChange={(e) => handleCustomerImport(e)}
                              className="hidden"
                              disabled={loading}
                            />
                          </label>
                          <a
                            href="/musteri-ornegi.csv"
                            download="musteri-ornegi.csv"
                            className="text-xs text-blue-600 hover:underline text-center"
                          >
                            📄 Örnek dosya
                          </a>
                        </div>
                        <button
                          onClick={() => openModal("customers")}
                          className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 text-sm"
                        >
                          + Ekle
                        </button>
                      </div>
                    </div>
                    <div
                      className="space-y-2 flex-1 overflow-y-auto"
                      style={{ maxHeight: "600px" }}
                    >
                      {getFilteredData("customers").map((customer: any) => (
                        <div
                          key={customer.id}
                          className="bg-white rounded p-4 flex justify-between items-center shadow-sm"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {customer.name}
                              {customer.company && (
                                <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                  🏢 {customer.company}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center space-x-2">
                              <span>{customer.email}</span>
                              {customer.city && (
                                <span className="text-blue-600">
                                  📍 {customer.city}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 mt-1 flex-wrap">
                              <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                📊 {customer.reservationCount || 0} rezervasyon
                              </div>
                              <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                ⭐ {customer.loyaltyPoints || 0} puan
                              </div>
                              {customer.visitCount && (
                                <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                  🔄 {customer.visitCount} ziyaret
                                </div>
                              )}
                              {customer.totalSpent && (
                                <div className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                  💰{" "}
                                  {customer.totalSpent.toLocaleString("tr-TR")}{" "}
                                  ₺
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => openModal("customers", customer)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() =>
                                handleDelete("customers", customer.id)
                              }
                              className="text-red-600 hover:text-red-800"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">
                        📥 Excel/CSV Import Bilgisi
                      </h4>
                      <p className="text-xs text-blue-700 mb-2">
                        Desteklenen kolon başlıkları:
                      </p>
                      <div className="grid grid-cols-1 gap-1 text-xs text-blue-600 mb-2">
                        <div className="font-medium text-blue-800">
                          📋 Temel Bilgiler:
                        </div>
                        <div className="pl-2">
                          • <strong>Ad</strong> / Name / İsim / Customer / İsim
                          Soyisim
                        </div>
                        <div className="pl-2">
                          • <strong>Email</strong> / E-posta / Mail / Email
                          address
                        </div>
                        <div className="pl-2">
                          • <strong>Telefon</strong> / Phone / Tel / Gsm /
                          Mobile / Telephone number
                        </div>
                        <div className="pl-2">
                          • <strong>Notlar</strong> / Notes / Not / Comments /
                          Description / Açıklama
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-1 text-xs text-blue-600 mb-2">
                        <div className="font-medium text-blue-800">
                          🏢 Formitable Özel Alanları:
                        </div>
                        <div className="pl-2">
                          • <strong>City</strong> / Şehir
                        </div>
                        <div className="pl-2">
                          • <strong>Address</strong> / Adres
                        </div>
                        <div className="pl-2">
                          • <strong>Birthday</strong> / Doğum Günü
                        </div>
                        <div className="pl-2">
                          • <strong>Company name</strong> / Firma Adı
                        </div>
                        <div className="pl-2">
                          • <strong>Visit count</strong> / Ziyaret Sayısı
                        </div>
                        <div className="pl-2">
                          • <strong>Total spent</strong> / Toplam Harcama
                        </div>
                        <div className="pl-2">
                          • <strong>Last updated</strong> / Son Güncelleme
                        </div>
                      </div>
                      <p className="text-xs text-blue-600 mt-2">
                        💡 Aynı ad+telefon kombinasyonu varsa atlanır
                        <br />
                        🎯 Formitable'dan export edilen dosyalar otomatik
                        desteklenir
                        <br />
                        💰 Harcama tutarından otomatik sadakat puanı hesaplanır
                        (10 TL = 1 puan)
                      </p>
                    </div>
                  </div>

                  {/* Kategoriler Kartı */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200 min-h-[600px] flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center space-x-2">
                        <div className="text-3xl">📂</div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Kategoriler
                          </h3>
                          <p className="text-sm text-gray-600">
                            {getFilteredData("categories").length} kayıt
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => openModal("categories")}
                        className="bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700 text-sm"
                      >
                        + Ekle
                      </button>
                    </div>
                    <div
                      className="space-y-2 flex-1 overflow-y-auto"
                      style={{ maxHeight: "600px" }}
                    >
                      {getFilteredData("categories").map((category: any) => (
                        <div
                          key={category.id}
                          className="bg-white rounded p-4 flex justify-between items-center shadow-sm"
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: category.color }}
                            ></div>
                            <div className="font-medium text-sm">
                              {category.name}
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => openModal("categories", category)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() =>
                                handleDelete("categories", category.id)
                              }
                              className="text-red-600 hover:text-red-800"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Masalar Kartı */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200 min-h-[600px] flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center space-x-2">
                        <div className="text-3xl">🪑</div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Masalar
                          </h3>
                          <p className="text-sm text-gray-600">
                            {getFilteredData("tables").length} kayıt
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => openModal("tables")}
                        className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 text-sm"
                      >
                        + Ekle
                      </button>
                    </div>
                    <div
                      className="space-y-1 flex-1 overflow-y-auto"
                      style={{ maxHeight: "600px" }}
                    >
                      {getFilteredData("tables").map((table: any) => {
                        // Masanın kategorisini bul
                        const category = getFilteredData("categories").find(
                          (cat: any) => cat.id === table.category_id
                        );

                        return (
                          <div
                            key={table.id}
                            className={`bg-white rounded p-2 shadow-sm border-l-4 ${
                              table.isAvailableForCustomers !== false
                                ? "border-green-500"
                                : "border-orange-500"
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <div className="font-medium text-sm">
                                    Masa {table.number}
                                  </div>
                                  {table.tableName && (
                                    <div className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded">
                                      {table.tableName}
                                    </div>
                                  )}
                                  {category && (
                                    <div
                                      className="text-xs px-1 py-0.5 rounded flex items-center space-x-1"
                                      style={{
                                        backgroundColor: category.color + "20",
                                        color: category.color,
                                        border: `1px solid ${category.color}40`,
                                      }}
                                    >
                                      <div
                                        className="w-1.5 h-1.5 rounded-full"
                                        style={{
                                          backgroundColor: category.color,
                                        }}
                                      ></div>
                                      <span>{category.name}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center space-x-3 text-xs text-gray-500">
                                  <div>
                                    👥{" "}
                                    {table.minCapacity || table.capacity || 1}-
                                    {table.maxCapacity || table.capacity || 4}{" "}
                                    kişi
                                  </div>
                                  <div
                                    className={`px-1 py-0.5 rounded ${
                                      table.isAvailableForCustomers !== false
                                        ? "bg-green-100 text-green-700"
                                        : "bg-orange-100 text-orange-700"
                                    }`}
                                  >
                                    {table.isAvailableForCustomers !== false
                                      ? "🌐 Online"
                                      : "🔒 Admin"}
                                  </div>
                                </div>
                              </div>

                              <div className="flex space-x-1 ml-2">
                                <button
                                  onClick={() => openModal("tables", table)}
                                  className="text-blue-600 hover:text-blue-800 text-sm"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() =>
                                    handleDelete("tables", table.id)
                                  }
                                  className="text-red-600 hover:text-red-800 text-sm"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Garsonlar Kartı */}
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200 min-h-[600px] flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center space-x-2">
                        <div className="text-3xl">👨‍💼</div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Garsonlar
                          </h3>
                          <p className="text-sm text-gray-600">
                            {getFilteredData("waiters").length} kayıt
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setShowWaiterModal(true)}
                          className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 text-sm"
                        >
                          🔧 Yönet
                        </button>
                        <button
                          onClick={() => openModal("waiters")}
                          className="bg-orange-600 text-white px-3 py-1 rounded-lg hover:bg-orange-700 text-sm"
                        >
                          + Ekle
                        </button>
                      </div>
                    </div>
                    <div
                      className="space-y-2 flex-1 overflow-y-auto"
                      style={{ maxHeight: "600px" }}
                    >
                      {getFilteredData("waiters").map((waiter: any) => (
                        <div
                          key={waiter.id}
                          className="bg-white rounded p-4 flex justify-between items-center shadow-sm"
                        >
                          <div>
                            <div className="font-medium text-sm flex items-center space-x-2">
                              <span>
                                {waiter.position === "waiter" ? "👨‍💼" : "🧑‍🍳"}
                              </span>
                              <span>{waiter.name}</span>
                              <span className="text-xs text-gray-500">
                                (
                                {waiter.position === "waiter"
                                  ? "Garson"
                                  : "Komi"}
                                )
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {waiter.phone}
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => openModal("waiters", waiter)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete("waiters", waiter.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!selectedRestaurant && selectedCompany && (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="text-6xl mb-4">🍽️</div>
              <div className="text-xl font-medium text-gray-900 mb-2">
                Restoran Seçin
              </div>
              <div className="text-gray-600">
                {selectedCompany.name} firmasından bir restoran seçin ve
                detaylarını yönetin
              </div>
            </div>
          )}

          {!selectedCompany && (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="text-6xl mb-4">🏢</div>
              <div className="text-xl font-medium text-gray-900 mb-2">
                Hoş Geldiniz
              </div>
              <div className="text-gray-600">
                Başlamak için yukarıdan bir firma seçin
              </div>
            </div>
          )}

          {/* Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">
                    {editingItem ? "✏️ Düzenle" : "➕ Yeni Ekle"} - {modalType}
                  </h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  {modalType !== "tables" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {modalType === "companies"
                          ? "Firma Adı"
                          : modalType === "restaurants"
                          ? "Restoran Adı"
                          : modalType === "customers"
                          ? "Müşteri Adı"
                          : modalType === "waiters"
                          ? "Garson Adı"
                          : modalType === "categories"
                          ? "Kategori Adı"
                          : "İsim"}{" "}
                        *
                      </label>
                      <input
                        type="text"
                        placeholder={
                          modalType === "companies"
                            ? "Örn: ABC Restoran Grubu"
                            : modalType === "restaurants"
                            ? "Örn: Bebek Şubesi"
                            : modalType === "customers"
                            ? "Örn: Ahmet Yılmaz"
                            : modalType === "waiters"
                            ? "Örn: Ali Demir"
                            : modalType === "categories"
                            ? "Örn: VIP Salon"
                            : "İsim giriniz"
                        }
                        value={formData.name || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}

                  {modalType !== "categories" && modalType !== "tables" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          E-posta Adresi
                        </label>
                        <input
                          type="email"
                          placeholder="Örn: info@restaurant.com"
                          value={formData.email || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Telefon Numarası
                        </label>
                        <input
                          type="tel"
                          placeholder="Örn: +90 212 123 45 67"
                          value={formData.phone || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Adres
                        </label>
                        <input
                          type="text"
                          placeholder="Örn: Bebek Mahallesi, Cevdetpaşa Cad. No:123, Beşiktaş/İstanbul"
                          value={formData.address || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              address: e.target.value,
                            })
                          }
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </>
                  )}

                  {modalType === "customers" && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Şehir
                          </label>
                          <input
                            type="text"
                            placeholder="Örn: İstanbul"
                            value={formData.city || ""}
                            onChange={(e) =>
                              setFormData({ ...formData, city: e.target.value })
                            }
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Çalıştığı Firma
                          </label>
                          <input
                            type="text"
                            placeholder="Örn: ABC Şirketi"
                            value={formData.company || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                company: e.target.value,
                              })
                            }
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Doğum Tarihi
                        </label>
                        <input
                          type="date"
                          value={formData.birthday || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              birthday: e.target.value,
                            })
                          }
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notlar ve Özel Talepler
                        </label>
                        <textarea
                          placeholder="Örn: Vejetaryen, glutensiz diyet, doğum günü kutlaması vb."
                          value={formData.notes || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, notes: e.target.value })
                          }
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          rows={3}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Toplam Ziyaret Sayısı
                          </label>
                          <input
                            type="number"
                            placeholder="Örn: 5"
                            min="0"
                            value={formData.visitCount || 0}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                visitCount: parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Toplam Harcama (TL)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Örn: 1250.50"
                            min="0"
                            value={formData.totalSpent || 0}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                totalSpent: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Rezervasyon Sayısı
                          </label>
                          <input
                            type="number"
                            placeholder="Örn: 12"
                            min="0"
                            value={formData.reservationCount || 0}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                reservationCount: parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Sadakat Puanı
                          </label>
                          <input
                            type="number"
                            placeholder="Örn: 150"
                            min="0"
                            value={formData.loyaltyPoints || 0}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                loyaltyPoints: parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {modalType === "restaurants" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Toplam Kapasite (Kişi Sayısı)
                        </label>
                        <input
                          type="number"
                          placeholder="Örn: 120 (restoranın toplam müşteri kapasitesi)"
                          min="1"
                          value={formData.capacity || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              capacity: parseInt(e.target.value),
                            })
                          }
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Default Rezervasyon Süresi *
                        </label>
                        <select
                          value={formData.reservationDuration || "120"}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              reservationDuration: parseInt(e.target.value),
                            })
                          }
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="60">1 Saat</option>
                          <option value="90">1.5 Saat</option>
                          <option value="120">2 Saat</option>
                          <option value="150">2.5 Saat</option>
                          <option value="180">3 Saat</option>
                          <option value="240">4 Saat</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          Yeni rezervasyonlar için varsayılan süre
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Açılış Saati *
                          </label>
                          <input
                            type="time"
                            value={formData.openingTime || "07:00"}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                openingTime: e.target.value,
                              })
                            }
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Restoranın sabah açılış saati
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Kapanış Saati *
                          </label>
                          <input
                            type="time"
                            value={formData.closingTime || "02:00"}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                closingTime: e.target.value,
                              })
                            }
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Restoranın gece kapanış saati
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {modalType === "tables" && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Masa Numarası *
                          </label>
                          <input
                            type="number"
                            placeholder="Örn: 1, 2, 3..."
                            min="1"
                            value={formData.number || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                number: parseInt(e.target.value),
                              })
                            }
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Masa İsmi (Opsiyonel)
                          </label>
                          <input
                            type="text"
                            placeholder="Örn: Pencere Kenarı, VIP Salon"
                            value={formData.tableName || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                tableName: e.target.value,
                              })
                            }
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Minimum Kapasite *
                          </label>
                          <input
                            type="number"
                            placeholder="Örn: 1 (en az kaç kişi)"
                            min="1"
                            value={formData.minCapacity || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                minCapacity: parseInt(e.target.value),
                              })
                            }
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Maximum Kapasite *
                          </label>
                          <input
                            type="number"
                            placeholder="Örn: 4 (en fazla kaç kişi)"
                            min="1"
                            value={formData.maxCapacity || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                maxCapacity: parseInt(e.target.value),
                              })
                            }
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Masa Kategorisi
                        </label>
                        <select
                          value={formData.category_id || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              category_id: e.target.value,
                            })
                          }
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">
                            Kategori seçin (İç Salon, Bahçe, Teras vb.)
                          </option>
                          {getFilteredData("categories").map(
                            (category: any) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <div className="space-y-3">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.isAvailableForCustomers !== false}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                isAvailableForCustomers: e.target.checked,
                              })
                            }
                            className="rounded"
                          />
                          <span className="text-sm font-medium">
                            🌐 Müşteriler bu masayı online rezerve edebilir
                          </span>
                        </label>

                        <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
                          💡 <strong>Müşteri Erişim Kontrolü:</strong>
                          <br />✅ <strong>İşaretli:</strong> Müşteriler bu
                          masayı web sitesinden rezerve edebilir
                          <br />❌ <strong>İşaretsiz:</strong> Sadece yönetici
                          panelinden rezervasyon yapılabilir (VIP masalar için
                          ideal)
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Masa Açıklaması
                        </label>
                        <textarea
                          placeholder="Örn: Boğaz manzaralı, sessiz alan, çocuk sandalyesi mevcut, engelli erişimi var"
                          value={formData.description || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              description: e.target.value,
                            })
                          }
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          rows={2}
                        />
                      </div>
                    </>
                  )}

                  {modalType === "categories" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Kategori Rengi *
                      </label>
                      <input
                        type="color"
                        value={formData.color || "#3b82f6"}
                        onChange={(e) =>
                          setFormData({ ...formData, color: e.target.value })
                        }
                        className="w-full h-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Bu renk masa kategorisini ayırt etmek için kullanılır
                      </p>
                    </div>
                  )}

                  {modalType === "waiters" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pozisyon *
                      </label>
                      <select
                        value={formData.position || "waiter"}
                        onChange={(e) =>
                          setFormData({ ...formData, position: e.target.value })
                        }
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="waiter">👨‍💼 Garson</option>
                        <option value="busboy">🧑‍🍳 Komi</option>
                      </select>
                    </div>
                  )}

                  {(modalType === "companies" ||
                    modalType === "restaurants" ||
                    modalType === "waiters") && (
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.isActive !== false}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isActive: e.target.checked,
                          })
                        }
                        className="rounded"
                      />
                      <span>Aktif</span>
                    </label>
                  )}
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? "Kaydediliyor..." : "Kaydet"}
                  </button>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                  >
                    İptal
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Waiter Management Modal */}
          <WaiterManagementModal
            isOpen={showWaiterModal}
            onClose={() => setShowWaiterModal(false)}
          />
        </div>
      </div>
    </div>
  );
}
