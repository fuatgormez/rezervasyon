"use client";

import { useState } from "react";
import Link from "next/link";

export default function InitUserPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreateSuperAdmin = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/init-user", {
        method: "GET",
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
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">
          Süper Admin Oluşturma
        </h1>

        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            Bu sayfa, rezervasyon sisteminde varsayılan bir süper admin
            kullanıcısı oluşturmanıza olanak tanır. Bu işlem yalnızca bir kez
            yapılmalıdır.
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
                  Varsayılan kullanıcı bilgileri:
                  <br />
                  Email: <strong>admin@example.com</strong>
                  <br />
                  Şifre: <strong>Admin123!</strong>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center mb-6">
          <button
            onClick={handleCreateSuperAdmin}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "İşleniyor..." : "Süper Admin Oluştur"}
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
            <p>
              <strong>Hata:</strong> {error}
            </p>
            <p className="text-sm mt-2">
              Bu hata genellikle kullanıcı zaten oluşturulmuşsa veya Firebase
              yapılandırmasında bir sorun varsa ortaya çıkar.
            </p>
          </div>
        )}

        {result && result.success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
            <p>
              <strong>Başarılı!</strong> Süper admin kullanıcısı oluşturuldu.
            </p>
            <p className="mt-2">
              <strong>Kullanıcı:</strong> {result.user.email}
              <br />
              <strong>ID:</strong> {result.user.id}
              <br />
              <strong>Ad:</strong> {result.user.name}
            </p>
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
