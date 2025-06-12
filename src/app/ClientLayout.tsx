"use client";

import { usePathname } from "next/navigation";
import Navbar from "../components/Navbar";
import { AuthProvider } from "@/lib/firebase";
import ToastProvider from "@/components/ToastProvider";

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <>
      {!isLoginPage && <Navbar />}
      <AuthProvider>
        <ToastProvider />
        {children}
      </AuthProvider>
    </>
  );
}
