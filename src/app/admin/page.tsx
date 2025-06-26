"use client";

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
