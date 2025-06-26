"use client";

import { useState } from "react";
import {
  Database,
  Building,
  Store,
  Users,
  Table,
  CheckCircle,
} from "lucide-react";
import { db } from "@/lib/firebase/config";
import { ref, set } from "firebase/database";

export default function SetupDemoPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const setupDemo = async () => {
    setLoading(true);
    setResult(null);

    try {
      // API'den demo verilerini al
      const response = await fetch("/api/setup-demo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const apiData = await response.json();

      if (!apiData.success) {
        throw new Error(apiData.error || "API hatası");
      }

      const { demoData } = apiData;
      console.log("Demo veriler alındı:", demoData);

      // Firebase'e veri yükleme
      console.log("Firebase'e yükleme başlatılıyor...");

      // 1. Firma verisini yükle
      const companyRef = ref(db, `companies/${demoData.company.id}`);
      await set(companyRef, demoData.company);
      console.log("✅ Firma yüklendi");

      // 2. Restoranları yükle
      for (const restaurant of demoData.restaurants) {
        const restaurantRef = ref(db, `restaurants/${restaurant.id}`);
        await set(restaurantRef, restaurant);
      }
      console.log("✅ Restoranlar yüklendi");

      // 3. Kullanıcıları yükle
      for (const user of demoData.users) {
        const userRef = ref(db, `users/${user.uid}`);
        await set(userRef, user);
      }
      console.log("✅ Kullanıcılar yüklendi");

      // 4. Demo masa kategorileri ve masaları yükle
      const categories = [
        { id: "ana-salon", name: "Ana Salon", color: "#3B82F6", sortOrder: 1 },
        { id: "terrace", name: "Terrace", color: "#10B981", sortOrder: 2 },
        { id: "bahce", name: "Bahçe", color: "#F59E0B", sortOrder: 3 },
        { id: "vip", name: "VIP", color: "#8B5CF6", sortOrder: 4 },
      ];

      let totalTables = 0;

      // Her restoran için kategoriler ve masalar oluştur
      for (const restaurant of demoData.restaurants) {
        // Kategorileri yükle
        for (const category of categories) {
          const categoryRef = ref(
            db,
            `tableCategories/${restaurant.id}-${category.id}`
          );
          await set(categoryRef, {
            ...category,
            id: `${restaurant.id}-${category.id}`,
            restaurantId: restaurant.id,
            companyId: restaurant.companyId,
          });
        }

        // Masaları yükle
        const tableCounts = { "ana-salon": 8, terrace: 4, bahce: 3, vip: 2 };

        for (const [categoryId, count] of Object.entries(tableCounts)) {
          for (let i = 1; i <= count; i++) {
            const tableId = `${restaurant.id}-${categoryId}-${i}`;
            const tableRef = ref(db, `tables/${tableId}`);
            await set(tableRef, {
              id: tableId,
              number: `${categoryId.toUpperCase()}-${i}`,
              categoryId: `${restaurant.id}-${categoryId}`,
              restaurantId: restaurant.id,
              companyId: restaurant.companyId,
              capacity:
                categoryId === "vip" ? 8 : categoryId === "terrace" ? 6 : 4,
              isActive: true,
              position: { x: i * 100, y: 100 },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            totalTables++;
          }
        }
      }

      console.log("✅ Kategoriler ve masalar yüklendi");

      setResult({
        success: true,
        message: "Demo veriler başarıyla Firebase'e yüklendi!",
        data: {
          company: 1,
          restaurants: demoData.restaurants.length,
          users: demoData.users.length,
          categories: categories.length,
          tables: totalTables,
        },
      });
    } catch (error) {
      console.error("Setup error:", error);
      setResult({
        success: false,
        error:
          error instanceof Error ? error.message : "Bilinmeyen hata oluştu",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Database className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Zonekult Demo Setup
            </h1>
            <p className="text-gray-600">
              Multi-tenant rezervasyon sistemi için demo verilerini yükleyin
            </p>
          </div>

          {/* Demo Data Info */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Yüklenecek Demo Veriler:
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <Building className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-medium">1 Firma</div>
                  <div className="text-sm text-gray-500">
                    Tamer Restoran Grubu
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Store className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-medium">3 Restoran</div>
                  <div className="text-sm text-gray-500">
                    Merkez, Kadıköy, Bebek
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-purple-600" />
                <div>
                  <div className="font-medium">5 Kullanıcı</div>
                  <div className="text-sm text-gray-500">
                    Super Admin + Firma Admin + Restoran Yöneticileri
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Table className="w-5 h-5 text-orange-600" />
                <div>
                  <div className="font-medium">37 Masa</div>
                  <div className="text-sm text-gray-500">
                    Kategoriler ve masalar
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Demo Users */}
          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Demo Kullanıcı Hesapları:
            </h3>

            <div className="space-y-3">
              <div className="bg-white rounded-md p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-purple-700">
                      Super Admin
                    </div>
                    <div className="text-sm text-gray-600">
                      admin@zonekult.com
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                    Tüm Firmalar
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-md p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-blue-700">
                      Tamer Bey (Firma Admin)
                    </div>
                    <div className="text-sm text-gray-600">
                      tamer@tamerrestoran.com
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    3 Restoran
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-md p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-green-700">
                      Restoran Yöneticileri
                    </div>
                    <div className="text-sm text-gray-600">
                      manager.merkez@, manager.kadikoy@, manager.bebek@
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    1 Restoran
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="text-center">
            <button
              onClick={setupDemo}
              disabled={loading}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 mx-auto"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  <span>Yükleniyor...</span>
                </>
              ) : (
                <>
                  <Database className="w-5 h-5" />
                  <span>Demo Verilerini Yükle</span>
                </>
              )}
            </button>
          </div>

          {/* Result */}
          {result && (
            <div
              className={`mt-6 p-4 rounded-lg ${
                result.success
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <div className="flex items-start space-x-3">
                {result.success ? (
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <div className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5">
                    ⚠️
                  </div>
                )}
                <div className="flex-1">
                  <h4
                    className={`font-medium ${
                      result.success ? "text-green-900" : "text-red-900"
                    }`}
                  >
                    {result.success ? "Başarılı!" : "Hata!"}
                  </h4>
                  <p
                    className={`text-sm mt-1 ${
                      result.success ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {result.message || result.error}
                  </p>

                  {result.success && result.data && (
                    <div className="mt-3 text-sm text-green-700">
                      <div>• {result.data.company} firma yüklendi</div>
                      <div>• {result.data.restaurants} restoran yüklendi</div>
                      <div>• {result.data.users} kullanıcı yüklendi</div>
                      <div>• {result.data.categories} kategori yüklendi</div>
                      <div>• {result.data.tables} masa yüklendi</div>
                    </div>
                  )}

                  {result.success && (
                    <div className="mt-4 space-y-2">
                      <a
                        href="/admin/super"
                        className="inline-block bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 text-sm"
                      >
                        Super Admin Paneli
                      </a>
                      <a
                        href="/admin"
                        className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm ml-2"
                      >
                        Rezervasyon Paneli
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
