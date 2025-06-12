"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

// Dinamik olarak yüklenen bileşenler
const RezervasyonPaneli = dynamic(
  () => import("@/components/admin/RezervasyonPaneli"),
  {
    ssr: false,
    loading: () => <LoadingSpinner />,
  }
);

// Yükleme göstergesi
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center w-full min-h-[60vh]">
      <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      <span className="ml-2 text-lg text-gray-700">Yükleniyor...</span>
    </div>
  );
}

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Oturum durumunu kontrol et
  useEffect(() => {
    // Kullanıcı oturum durumunu localStorage'dan kontrol et
    const checkLoginStatus = () => {
      const userStatus = localStorage.getItem("userLoggedIn");
      if (userStatus === "true") {
        setIsLoggedIn(true);
      }
      setIsLoading(false);
    };

    // Tarayıcı tarafında çalıştığından emin ol
    if (typeof window !== "undefined") {
      checkLoginStatus();
    }
  }, []);

  // Yükleme durumunda spinner göster
  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Ana içerik */}
      <main className="flex-grow w-full">
        <Suspense fallback={<LoadingSpinner />}>
          <RezervasyonPaneli />
        </Suspense>
      </main>
    </div>
  );
}
