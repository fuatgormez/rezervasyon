"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ReservationSuccessPage() {
  const router = useRouter();

  // 5 saniye sonra rezervasyonlar sayfasına yönlendir
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/reservations");
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg text-center">
        <div className="mb-4">
          <svg
            className="mx-auto h-16 w-16 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Rezervasyonunuz Alındı!
        </h2>
        <p className="text-gray-600 mb-6">
          Rezervasyonunuz başarıyla oluşturuldu. Rezervasyon durumunuzu kontrol
          etmek için rezervasyonlar sayfasını ziyaret edebilirsiniz.
        </p>
        <div className="flex flex-col space-y-3">
          <Link
            href="/reservations"
            className="inline-block w-full px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700"
          >
            Rezervasyonlarım
          </Link>
          <Link
            href="/"
            className="inline-block w-full px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300"
          >
            Ana Sayfaya Dön
          </Link>
        </div>
        <p className="text-sm text-gray-500 mt-6">
          5 saniye içinde otomatik olarak yönlendirileceksiniz...
        </p>
      </div>
    </div>
  );
}
