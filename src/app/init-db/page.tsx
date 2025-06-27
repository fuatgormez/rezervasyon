"use client";

import { useState } from "react";
import Link from "next/link";

export default function InitDbPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInitDb = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/init-db", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.message || "API yanıtı başarısız oldu");
        console.error("API Hatası:", data);
      }
    } catch (error: any) {
      console.error("Fetch Hatası:", error);
      setError(
        error.message || "Bir hata oluştu, konsol detaylarını kontrol edin"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-3xl">
        <h1 className="text-2xl font-bold text-center mb-6">
          Firebase Realtime Database Başlatma
        </h1>

        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            Bu sayfa, rezervasyon sistemi için Firebase Realtime Database'in
            gerekli koleksiyonlarını ve örnek verilerini oluşturur. Bu işlem
            sadece bir kez yapılmalıdır. İşlemin başarılı olması için Firebase
            Realtime Database kurallarını düzenlemeniz gerekebilir.
          </p>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Not:</strong> İşlem sırasında "Permission denied"
                  hatası alırsanız, Firebase konsolundan Realtime Database
                  kurallarını değiştirmeniz gerekiyor.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center mb-6">
          <button
            onClick={handleInitDb}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "İşleniyor..." : "Veritabanını Başlat"}
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
            <p>
              <strong>Hata:</strong> {error}
            </p>
          </div>
        )}

        {result && (
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">
              {result.success ? "İşlem Başarılı" : "İşlem Başarısız"}
            </h2>
            <p className="mb-2">{result.message}</p>

            <div className="bg-gray-100 p-4 rounded-md">
              <h3 className="font-semibold mb-2">Sonuçlar:</h3>
              <ul className="list-disc ml-5 space-y-1">
                {result.results.map((item: string, index: number) => (
                  <li
                    key={index}
                    className={item.includes("hata") ? "text-red-600" : ""}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {result.results.some(
              (item: string) =>
                item.includes("Permission denied") ||
                item.includes("izin hatası")
            ) && (
              <div className="mt-4 bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4">
                <h3 className="font-semibold mb-2">
                  Firebase Kurallarını Düzenleme
                </h3>
                <p className="mb-2">
                  "Permission denied" hatası alıyorsanız, Firebase Realtime
                  Database kurallarını değiştirmeniz gerekiyor:
                </p>
                <ol className="list-decimal ml-5 space-y-1">
                  <li>
                    Firebase konsoluna gidin
                    (https://console.firebase.google.com/)
                  </li>
                  <li>Projenizi seçin: reservation-4d834</li>
                  <li>Sol menüden "Realtime Database" seçin</li>
                  <li>"Rules" sekmesine tıklayın</li>
                  <li>
                    Aşağıdaki kuralları yapıştırın ve "Publish" düğmesine
                    tıklayın:
                  </li>
                </ol>
                <pre className="bg-gray-900 text-gray-100 p-3 rounded mt-2 overflow-x-auto">
                  {`{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}`}
                </pre>
                <p className="mt-2">
                  Kuralları güncelledikten sonra, bu sayfayı yenileyin ve
                  "Veritabanını Başlat" düğmesine tekrar tıklayın.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-center mt-4">
          <Link href="/admin/login">
            <span className="text-blue-500 hover:text-blue-700">
              Admin Girişine Git →
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
