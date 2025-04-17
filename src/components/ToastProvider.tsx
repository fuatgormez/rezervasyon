"use client";

import { Toaster } from "react-hot-toast";

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        // Varsayılan stil ayarları
        duration: 3000,
        style: {
          background: "#363636",
          color: "#fff",
          borderRadius: "8px",
          padding: "12px 16px",
          boxShadow: "0 3px 10px rgba(0, 0, 0, 0.1)",
          fontSize: "14px",
        },
        // Başarılı toast'lar için stil
        success: {
          iconTheme: {
            primary: "#10B981",
            secondary: "#fff",
          },
          style: {
            background: "#10B981",
            color: "#fff",
          },
        },
        // Hata toast'ları için stil
        error: {
          iconTheme: {
            primary: "#EF4444",
            secondary: "#fff",
          },
          style: {
            background: "#EF4444",
            color: "#fff",
          },
        },
      }}
    />
  );
}
