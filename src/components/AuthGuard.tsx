"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/hooks";
import { UserRole } from "@/types/user";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

export default function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { user, loading, isAdmin, isSuperAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
        router.push("/login");
      } else if (requiredRole) {
        // Rol kontrolü
        const hasAccess =
          requiredRole === UserRole.USER ||
          (requiredRole === UserRole.ADMIN && (isAdmin() || isSuperAdmin())) ||
          (requiredRole === UserRole.SUPER_ADMIN && isSuperAdmin());

        if (!hasAccess) {
          // Yetkisiz erişim durumunda ana sayfaya yönlendir
          router.push("/");
        }
      }
    }
  }, [user, loading, requiredRole, router, isAdmin, isSuperAdmin]);

  if (loading) {
    return <div>Yükleniyor...</div>;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
