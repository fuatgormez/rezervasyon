"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Rezervasyon Sistemine Hoş Geldiniz
          </h1>
          <p className="text-xl text-gray-600">
            Hızlı ve kolay rezervasyon için doğru adrestesiniz
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Admin Kartı */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Admin Paneli
            </h2>
            <p className="text-gray-600 mb-6">
              Yönetici paneline erişmek için tıklayın
            </p>
            <Link href="/admin" className="btn btn-primary block text-center">
              Admin Paneline Git
            </Link>
          </div>

          {/* Rezervasyon Kartı */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Rezervasyonlar
            </h2>
            <p className="text-gray-600 mb-6">
              Rezervasyonları görüntülemek ve yönetmek için tıklayın
            </p>
            <Link
              href="/rezervasyon"
              className="btn btn-primary block text-center"
            >
              Rezervasyonları Görüntüle
            </Link>
          </div>

          {/* Yardım Kartı */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Yardım & Destek
            </h2>
            <p className="text-gray-600 mb-6">
              Sorularınız için yardım merkezimizi ziyaret edin
            </p>
            <Link href="/yardim" className="btn btn-outline block text-center">
              Yardım Al
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
