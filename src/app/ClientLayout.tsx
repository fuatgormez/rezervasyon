"use client";

import { AuthProvider } from "@/lib/firebase";
import ToastProvider from "@/components/ToastProvider";

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <AuthProvider>
        <ToastProvider />
        {children}
      </AuthProvider>
    </>
  );
}
