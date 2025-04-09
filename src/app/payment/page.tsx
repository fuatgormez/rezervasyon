"use client";

import { useRouter } from "next/navigation";

export default function PaymentPage() {
  const router = useRouter();

  const handleTestPayment = () => {
    // Test için rastgele bir rezervasyon ID'si oluşturuyoruz
    const testReservationId = "test_" + Math.random().toString(36).substr(2, 9);
    router.push(`/reservation/confirmation?id=${testReservationId}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-6">Ödeme İşlemi</h1>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Ödeme Detayları</h2>
          <p className="text-gray-600">Toplam Tutar: 100 TL</p>
        </div>

        <button
          onClick={handleTestPayment}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
        >
          Test Ödemesi Yap
        </button>
      </div>
    </div>
  );
}
