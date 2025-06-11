"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { resetFirebaseConnection } from "@/lib/firebase/reset";

export default function ResetFirebasePage() {
  const [isResetting, setIsResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // IndexedDB veritabanlarını listele
  const [databases, setDatabases] = useState<string[]>([]);

  useEffect(() => {
    // Mevcut IndexedDB veritabanlarını tespit et
    if (typeof window !== "undefined" && "indexedDB" in window) {
      const listDatabases = async () => {
        try {
          // @ts-ignore - eski tarayıcılarda bu özellik olmayabilir
          const dbList = await window.indexedDB.databases();
          if (dbList && Array.isArray(dbList)) {
            setDatabases(
              dbList.map((db) => db.name || "Bilinmeyen DB").filter(Boolean)
            );
          }
        } catch (error) {
          console.error("IndexedDB veritabanları listelenirken hata:", error);
        }
      };

      listDatabases();
    }
  }, []);

  // Firebase bağlantısını sıfırla
  const handleReset = async () => {
    try {
      setIsResetting(true);
      setMessage(null);
      setSuccess(false);

      // Firebase'i sıfırla
      const result = await resetFirebaseConnection();
      setMessage(result.message);
      setSuccess(result.success);

      if (result.success) {
        // IndexedDB'yi manuel olarak temizlemeye çalış
        if (typeof window !== "undefined" && "indexedDB" in window) {
          for (const dbName of databases) {
            try {
              if (dbName.includes("firebase") || dbName.includes("firestore")) {
                const deleteRequest = window.indexedDB.deleteDatabase(dbName);
                deleteRequest.onsuccess = () => {
                  console.log(`"${dbName}" veritabanı başarıyla silindi`);
                };
                deleteRequest.onerror = () => {
                  console.error(
                    `"${dbName}" veritabanı silinirken hata oluştu`
                  );
                };
              }
            } catch (error) {
              console.error(
                `IndexedDB veritabanı silinirken hata: ${dbName}`,
                error
              );
            }
          }
        }
      }
    } catch (error) {
      setMessage(
        `Sıfırlama sırasında hata: ${
          error instanceof Error ? error.message : "Bilinmeyen hata"
        }`
      );
    } finally {
      setIsResetting(false);
    }
  };

  // Tarayıcı önbelleğini temizle
  const handleClearCache = async () => {
    try {
      if ("caches" in window) {
        const cacheNames = await window.caches.keys();
        await Promise.all(
          cacheNames.map((cacheName) => {
            return window.caches.delete(cacheName);
          })
        );
        setMessage("Tarayıcı önbelleği başarıyla temizlendi.");
        setSuccess(true);
      } else {
        setMessage("Bu tarayıcıda önbellek API'si desteklenmiyor.");
        setSuccess(false);
      }
    } catch (error) {
      setMessage(
        `Önbellek temizlenirken hata: ${
          error instanceof Error ? error.message : "Bilinmeyen hata"
        }`
      );
      setSuccess(false);
    }
  };

  // Sayfayı yenile
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-lg mx-auto bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">
          Firebase Bağlantısını Sıfırla
        </h1>

        <div className="mb-6">
          <p className="text-gray-700 mb-2">
            Bu sayfa, Firebase bağlantısını tamamen sıfırlamanıza olanak tanır.
            Aşağıdaki işlemler gerçekleştirilecektir:
          </p>

          <ul className="list-disc pl-5 mb-4 text-gray-600">
            <li>Firestore bağlantısı kapatılacak</li>
            <li>IndexedDB veritabanı temizlenecek</li>
            <li>Firebase uygulaması kapatılacak</li>
          </ul>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <p className="text-yellow-700">
              <strong>Uyarı:</strong> Bu işlem, çevrimdışı durumda kalan
              Firebase bağlantısını düzeltmek içindir. İşlem sonrasında sayfayı
              yenilemeniz gerekecektir.
            </p>
          </div>
        </div>

        {databases.length > 0 && (
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-2">
              Tespit Edilen IndexedDB Veritabanları:
            </h2>
            <ul className="bg-gray-50 p-3 rounded text-sm">
              {databases.map((db, index) => (
                <li key={index} className="py-1">
                  {db}{" "}
                  {(db.includes("firebase") || db.includes("firestore")) && (
                    <span className="text-red-500">(Firebase)</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {message && (
          <div
            className={`mb-4 p-3 rounded-lg ${
              success
                ? "bg-green-50 border-l-4 border-green-500 text-green-700"
                : "bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700"
            }`}
          >
            {message}
          </div>
        )}

        <div className="flex flex-col space-y-3">
          <button
            onClick={handleReset}
            disabled={isResetting}
            className={`py-2 px-4 rounded ${
              isResetting
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-red-500 hover:bg-red-600 text-white"
            }`}
          >
            {isResetting ? "Sıfırlanıyor..." : "Firebase Bağlantısını Sıfırla"}
          </button>

          <button
            onClick={handleClearCache}
            className="py-2 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded"
          >
            Tarayıcı Önbelleğini Temizle
          </button>

          <button
            onClick={handleReload}
            className="py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded"
          >
            Sayfayı Yenile
          </button>

          <Link href="/init-db">
            <button className="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 rounded">
              Veritabanı Başlatma Sayfasına Dön
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
