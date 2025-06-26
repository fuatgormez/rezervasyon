"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";

export default function TokenRecovery() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    console.log("🔄 TokenRecovery starting recovery check");

    const recoverToken = () => {
      // Sadece client-side'da çalış
      if (typeof window === "undefined") return;

      const cookieToken = Cookies.get("auth-token");
      console.log("🔄 Cookie token:", cookieToken ? "EXISTS" : "NONE");

      if (!cookieToken) {
        const localToken = localStorage.getItem("auth-token");
        const sessionToken = sessionStorage.getItem("auth-token");
        const backupToken = localToken || sessionToken;

        console.log("🔄 localStorage token:", localToken ? "EXISTS" : "NONE");
        console.log(
          "🔄 sessionStorage token:",
          sessionToken ? "EXISTS" : "NONE"
        );

        if (backupToken) {
          console.log("🔄 Recovering token from storage");
          Cookies.set("auth-token", backupToken, {
            expires: 7,
            path: "/",
            sameSite: "lax",
          });
          console.log("✅ Token recovered successfully - NO RELOAD");
        } else {
          console.log("❌ No backup token found");
        }
      } else {
        console.log("✅ Cookie token already exists");
      }
    };

    // Sadece bir kez çalıştır
    recoverToken();
  }, [mounted]);

  return null;
}
