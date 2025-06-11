"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/lib/firebase";

interface AuthGuardProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export default function AuthGuard({
  children,
  adminOnly = false,
}: AuthGuardProps) {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Yükleme tamamlandıysa
    if (!loading) {
      // Kullanıcı yoksa login sayfasına yönlendir
      if (!user) {
        router.push("/login");
        return;
      }

      // Admin kontrolü yapılması gerekiyorsa
      if (adminOnly) {
        // Admin kontrolü için Firebase'den kullanıcı rolünü kontrol et
        // Bu kısım Firestore'dan veri çekerek yapılabilir
        // Örnek: getDoc(doc(db, "users", user.uid)).then(...)

        // Şimdilik basit bir örnek
        setIsAuthorized(true);
      } else {
        // Sadece giriş yapmış olması yeterli
        setIsAuthorized(true);
      }
    }
  }, [user, loading, adminOnly, router]);

  // Yükleme sırasında veya yetkilendirme kontrolü yapılırken bir loading ekranı göster
  if (loading || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Kullanıcı yetkiliyse içeriği göster
  return <>{children}</>;
}
