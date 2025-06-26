"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/hooks";
import Image from "next/image";
import Link from "next/link";
import { createJWTToken, verifyJWTToken } from "@/lib/jwt";
import Cookies from "js-cookie";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading: authLoading, error: authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect guard - localStorage ile persist et
  const [hasRedirected, setHasRedirected] = React.useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("login-redirect-guard") === "true";
    }
    return false;
  });

  // Manual token kontrolü
  React.useEffect(() => {
    if (hasRedirected) return; // Zaten yönlendirme yapıldıysa çık

    const checkTokenManually = () => {
      if (typeof window === "undefined") return;

      const token = Cookies.get("auth-token");

      if (token && !hasRedirected) {
        // JWT token'ı doğrula
        const decoded = verifyJWTToken(token);
        if (decoded) {
          setHasRedirected(true);
          localStorage.setItem("login-redirect-guard", "true");
          router.replace("/admin");
          return;
        } else {
          // Geçersiz token'ı temizle
          Cookies.remove("auth-token");
          localStorage.removeItem("auth-token");
          sessionStorage.removeItem("auth-token");
        }
      }
    };

    // İlk kontrol
    checkTokenManually();

    // Eğer loading bitmişse ve user varsa yönlendir
    if (!authLoading && user && !hasRedirected) {
      setHasRedirected(true);
      localStorage.setItem("login-redirect-guard", "true");
      router.replace("/admin");
    }
  }, [user, authLoading, router, hasRedirected]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      console.log("Giriş işlemi başlatılıyor...");
      const result = await login(email, password);
      console.log("Giriş başarılı, yönlendiriliyor...");

      // URL'den 'from' parametresini kontrol et
      const searchParams = new URLSearchParams(window.location.search);
      const from = searchParams.get("from");

      if (from) {
        // Eğer belirli bir sayfadan yönlendirildiyse oraya geri git
        router.push(from);
      } else {
        // Varsayılan olarak admin paneline yönlendir
        router.push("/admin");
      }

      router.refresh(); // Sayfayı yenile
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Giriş başarısız oldu");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      title: "Kolay Rezervasyon",
      description: "Müşterileriniz için hızlı ve kolay rezervasyon sistemi",
      icon: "📅",
    },
    {
      title: "Personel Yönetimi",
      description: "Personel vardiyalarını ve görevlerini kolayca yönetin",
      icon: "👥",
    },
    {
      title: "Gerçek Zamanlı Takip",
      description: "Rezervasyonları ve masa durumlarını anlık takip edin",
      icon: "📊",
    },
    {
      title: "Detaylı Raporlar",
      description: "İşletmenizin performansını detaylı raporlarla analiz edin",
      icon: "📈",
    },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Sol Taraf - Giriş Formu */}
      <div className="w-1/2 bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Hoş Geldiniz
            </h1>
            <p className="text-gray-600">Hesabınıza giriş yapın</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                E-posta veya Kullanıcı Adı
              </label>
              <input
                type="text"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin veya admin@zonekult.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Şifre
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="admin123"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-lg text-white font-medium ${
                loading
                  ? "bg-indigo-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              }`}
            >
              {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
            </button>

            {/* Test Kullanıcıları */}
            <div className="space-y-3">
              <div className="text-center text-sm font-medium text-gray-700 mb-3">
                🧪 Test Kullanıcıları (Tıklayarak Otomatik Doldur)
              </div>

              {/* Super Admin */}
              <button
                type="button"
                onClick={() => {
                  setEmail("admin@zonekult.com");
                  setPassword("123456");
                }}
                className="w-full p-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-left transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-purple-900">
                      👑 Super Admin
                    </div>
                    <div className="text-sm text-purple-600">
                      admin@zonekult.com
                    </div>
                    <div className="text-xs text-purple-500">
                      Tüm yetkilere sahip sistem yöneticisi
                    </div>
                  </div>
                  <div className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                    SUPER_ADMIN
                  </div>
                </div>
              </button>

              {/* Company Admin */}
              <button
                type="button"
                onClick={() => {
                  setEmail("tamer@tamerrestoran.com");
                  setPassword("123456");
                }}
                className="w-full p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-left transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-blue-900">
                      🏢 Firma Yöneticisi
                    </div>
                    <div className="text-sm text-blue-600">
                      tamer@tamerrestoran.com
                    </div>
                    <div className="text-xs text-blue-500">
                      Tamer Restoran Grubu - 3 Restoran
                    </div>
                  </div>
                  <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    COMPANY_ADMIN
                  </div>
                </div>
              </button>

              {/* Mock Admin (Eski test kullanıcısı) */}
              <button
                type="button"
                onClick={() => {
                  setEmail("admin");
                  setPassword("admin123");
                }}
                className="w-full p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-left transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">
                      🔧 Test Admin
                    </div>
                    <div className="text-sm text-gray-600">
                      admin / admin123
                    </div>
                    <div className="text-xs text-gray-500">
                      Mock data ile test kullanıcısı
                    </div>
                  </div>
                  <div className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    MOCK
                  </div>
                </div>
              </button>
            </div>

            {/* Restoran Bilgileri */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="text-sm font-medium text-green-800 mb-2">
                📍 Mevcut Restoranlar:
              </div>
              <div className="text-xs text-green-700 space-y-1">
                <div>
                  • <strong>Bebek Boğaziçi:</strong> Bebek Cad. No:123, Beşiktaş
                </div>
                <div>
                  • <strong>Kadıköy Moda:</strong> Moda Cad. No:456, Kadıköy
                </div>
                <div>
                  • <strong>Merkez Nişantaşı:</strong> Nişantaşı Cad. No:789,
                  Şişli
                </div>
              </div>
            </div>

            <div className="text-center text-sm text-gray-600">
              Hesabınız yok mu?{" "}
              <Link
                href="/register"
                className="text-indigo-600 hover:text-indigo-500"
              >
                Kayıt Olun
              </Link>
            </div>
          </form>
        </div>
      </div>

      {/* Sağ Taraf - Özellikler */}
      <div className="w-1/2 bg-indigo-600 flex items-center justify-center p-8">
        <div className="max-w-md text-white">
          <h2 className="text-3xl font-bold mb-8">
            Modern Rezervasyon Sistemi
          </h2>

          <div className="space-y-8">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start space-x-4">
                <div className="text-3xl">{feature.icon}</div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-indigo-100">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 bg-white/10 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Neden Biz?</h3>
            <ul className="space-y-3">
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                Kolay kullanım
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                7/24 destek
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                Güvenli altyapı
              </li>
              <li className="flex items-center">
                <span className="mr-2">✓</span>
                Özelleştirilebilir
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
