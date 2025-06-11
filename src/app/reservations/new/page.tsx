"use client";

import AuthGuard from "@/components/AuthGuard";
import ReservationForm from "@/components/ReservationForm";

export default function NewReservationPage() {
  return (
    <AuthGuard>
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Yeni Rezervasyon
        </h1>
        <ReservationForm />
      </div>
    </AuthGuard>
  );
}
