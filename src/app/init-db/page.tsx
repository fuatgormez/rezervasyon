"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { checkFirebaseConnection } from "@/lib/firebase/config";
import {
  checkInternetConnection,
  reconnectFirebase,
} from "@/services/firebase.service";
import { resetFirebaseConnection } from "@/lib/firebase/reset";

export default function InitDbPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "loading" | "success" | "error"
  >("loading");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // Firebase bağlantısını kontrol et
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Önce internet bağlantısını kontrol et
        const isOnline = await checkInternetConnection();
        if (!isOnline) {
          setConnectionStatus("error");
          setConnectionError(
            "İnternet bağlantısı bulunamadı. Lütfen bağlantınızı kontrol edin."
          );
          return;
        }

        // Firebase bağlantısını kontrol et
        const result = await checkFirebaseConnection();
        if (result.success) {
          setConnectionStatus("success");
        } else {
          console.error("Firebase bağlantı hatası:", result.error);
          setConnectionStatus("error");

          // Çevrimdışı hata mesajı kontrolü
          if (
            result.error &&
            typeof result.error === "string" &&
            (result.error.includes("offline") ||
              result.error.includes("çevrimdışı"))
          ) {
            setConnectionError(
              "Firebase çevrimdışı modda çalışıyor. Yeniden bağlanmayı deneyin."
            );
          } else {
            setConnectionError(
              result.error || "Bilinmeyen bir bağlantı hatası"
            );
          }
        }
      } catch (error) {
        console.error("Genel bağlantı hatası:", error);
        setConnectionStatus("error");
        setConnectionError(
          error instanceof Error
            ? error.message
            : "Bilinmeyen bir bağlantı hatası"
        );
      }
    };

    checkConnection();
  }, []);

  const initializeDatabase = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setResults([]);
      setSuccess(false);

      console.log("Veritabanı başlatma isteği gönderiliyor...");

      const response = await fetch("/api/init-db", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      });

      console.log("API yanıtı alındı, durum kodu:", response.status);

      if (!response.ok) {
        throw new Error(
          `API yanıtı başarısız: ${response.status} ${response.statusText}`
        );
      }

      const responseText = await response.text();
      console.log("API yanıt metni:", responseText);

      if (!responseText || responseText.trim() === "") {
        throw new Error("API'den boş yanıt alındı");
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError: any) {
        console.error("JSON parse hatası:", parseError);
        throw new Error(`JSON parse hatası: ${parseError.message}`);
      }

      console.log("İşlenmiş API yanıtı:", data);

      if (data.success) {
        setSuccess(true);
        setResults(data.results || []);
      } else {
        setError(data.error || "Bilinmeyen bir hata oluştu");
      }
    } catch (error) {
      console.error("Veritabanı başlatılırken hata:", error);
      setError(
        error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Yeniden bağlanma işlemi
  const handleReconnect = async () => {
    try {
      setIsReconnecting(true);
      setConnectionStatus("loading");
      setConnectionError(null);

      // İnternet bağlantısını kontrol et
      const isOnline = await checkInternetConnection();
      if (!isOnline) {
        setConnectionStatus("error");
        setConnectionError(
          "İnternet bağlantısı bulunamadı. Lütfen bağlantınızı kontrol edin."
        );
        return;
      }

      // Firebase ağını yeniden bağla
      await reconnectFirebase();

      // Bağlantıyı tekrar kontrol et
      const result = await checkFirebaseConnection();
      if (result.success) {
        setConnectionStatus("success");
        setConnectionError(null);
      } else {
        setConnectionStatus("error");
        setConnectionError(
          result.error ||
            "Firebase bağlantısı kurulamadı. Lütfen daha sonra tekrar deneyin."
        );
      }
    } catch (error) {
      setConnectionStatus("error");
      setConnectionError(
        error instanceof Error
          ? error.message
          : "Bilinmeyen bir bağlantı hatası"
      );
    } finally {
      setIsReconnecting(false);
    }
  };

  // Firebase'i tamamen sıfırlama işlemi
  const handleReset = async () => {
    try {
      setIsResetting(true);
      setResetMessage(null);

      // Firebase'i sıfırla
      const result = await resetFirebaseConnection();
      setResetMessage(result.message);

      if (result.success) {
        // Başarılı sıfırlama sonrası sayfayı yenileme tavsiyesi
        setTimeout(() => {
          if (
            window.confirm(
              "Firebase bağlantısı sıfırlandı. Sayfayı yenilemek ister misiniz?"
            )
          ) {
            window.location.reload();
          }
        }, 1500);
      }
    } catch (error) {
      setResetMessage(
        `Sıfırlama sırasında hata: ${
          error instanceof Error ? error.message : "Bilinmeyen hata"
        }`
      );
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-lg mx-auto bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Veritabanı Başlatma</h1>

        {/* Firebase Bağlantı Durumu */}
        <div className="mb-4">
          <div
            className={`p-3 rounded-lg ${
              connectionStatus === "loading"
                ? "bg-gray-100 text-gray-700"
                : connectionStatus === "success"
                ? "bg-green-50 text-green-700 border-l-4 border-green-500"
                : "bg-red-50 text-red-700 border-l-4 border-red-500"
            }`}
          >
            <div className="flex items-center">
              {connectionStatus === "loading" && (
                <div className="animate-pulse mr-2 h-3 w-3 rounded-full bg-gray-500"></div>
              )}
              {connectionStatus === "success" && (
                <svg
                  className="w-5 h-5 mr-2 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {connectionStatus === "error" && (
                <svg
                  className="w-5 h-5 mr-2 text-red-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <span className="font-medium">
                {connectionStatus === "loading" &&
                  "Firebase bağlantısı kontrol ediliyor..."}
                {connectionStatus === "success" && "Firebase bağlantısı aktif!"}
                {connectionStatus === "error" && "Firebase bağlantı hatası!"}
              </span>
            </div>
            {connectionStatus === "error" && connectionError && (
              <p className="mt-1 ml-7 text-sm">{connectionError}</p>
            )}

            {connectionStatus === "error" && (
              <div className="mt-3 ml-7">
                <div className="flex space-x-2">
                  <button
                    onClick={handleReconnect}
                    disabled={isReconnecting || isResetting}
                    className={`px-3 py-1 text-sm rounded ${
                      isReconnecting || isResetting
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-blue-500 hover:bg-blue-600 text-white"
                    }`}
                  >
                    {isReconnecting
                      ? "Yeniden Bağlanıyor..."
                      : "Yeniden Bağlan"}
                  </button>

                  <button
                    onClick={handleReset}
                    disabled={isReconnecting || isResetting}
                    className={`px-3 py-1 text-sm rounded ${
                      isReconnecting || isResetting
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-red-500 hover:bg-red-600 text-white"
                    }`}
                  >
                    {isResetting ? "Sıfırlanıyor..." : "Firebase Sıfırla"}
                  </button>
                </div>

                {resetMessage && (
                  <div
                    className={`mt-2 p-2 text-sm rounded ${
                      resetMessage.includes("başarıyla")
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                    }`}
                  >
                    {resetMessage}
                  </div>
                )}

                <p className="text-xs mt-1 text-gray-600">
                  Tarayıcıyı yenilemek de sorunu çözebilir. Sorun devam ederse{" "}
                  <Link
                    href="/reset-firebase"
                    className="text-blue-500 hover:underline"
                  >
                    Firebase bağlantısını tamamen sıfırlamayı
                  </Link>{" "}
                  deneyin.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 mb-2">
            Bu sayfa, rezervasyon sisteminin veritabanını başlatmanıza olanak
            tanır. Aşağıdaki işlemler gerçekleştirilecektir:
          </p>

          <ul className="list-disc pl-5 mb-4 text-gray-600">
            <li>Gerekli koleksiyonlar oluşturulacak</li>
            <li>Varsayılan ayarlar tanımlanacak</li>
            <li>Örnek masa kategorileri eklenecek</li>
            <li>Örnek masalar oluşturulacak</li>
          </ul>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <p className="text-yellow-700">
              <strong>Uyarı:</strong> Bu işlem, veritabanınızı sıfırdan
              oluşturacaktır. Eğer zaten veritabanı koleksiyonları mevcutsa, bu
              işlem onları silmez, ancak boş koleksiyonlara örnek veriler
              ekleyecektir.
            </p>
          </div>
        </div>

        <div className="flex space-x-3 mb-6">
          <button
            onClick={initializeDatabase}
            disabled={isLoading || connectionStatus !== "success"}
            className={`flex-1 py-2 px-4 rounded ${
              isLoading || connectionStatus !== "success"
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            {isLoading ? "İşlem Yapılıyor..." : "Veritabanını Başlat"}
          </button>

          <Link href="/admin">
            <button className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 rounded">
              Admin Paneline Dön
            </button>
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <p className="text-red-700">
              <strong>Hata:</strong> {error}
            </p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
            <p className="text-green-700">
              <strong>Başarılı!</strong> Veritabanı başarıyla başlatıldı.
            </p>
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">İşlem Sonuçları:</h3>
            <ul className="bg-gray-50 p-3 rounded border border-gray-200">
              {results.map((result, index) => (
                <li
                  key={index}
                  className="py-1 border-b border-gray-100 last:border-0"
                >
                  {result}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
