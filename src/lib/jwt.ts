// Client-side JWT-like token sistemi
// Gerçek JWT kütüphanesi Node.js için tasarlandığından, basit bir implementasyon kullanıyoruz

export interface JWTPayload {
  uid: string;
  email: string;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  iat?: number;
  exp?: number;
}

// Basit base64 encode/decode fonksiyonları
function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64UrlDecode(str: string): string {
  // Padding ekle
  str += "==".slice(0, (4 - (str.length % 4)) % 4);
  // URL-safe karakterleri değiştir
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  return atob(str);
}

/**
 * JWT-like token oluşturur (client-side uyumlu)
 */
export function createJWTToken(
  payload: Omit<JWTPayload, "iat" | "exp">
): string {
  const header = {
    alg: "none", // Client-side'da imzalama yok
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + 7 * 24 * 60 * 60, // 7 gün
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  // Client-side'da imza yok, sadece header.payload
  return `${encodedHeader}.${encodedPayload}.`;
}

/**
 * JWT-like token'ı doğrular ve decode eder
 */
export function verifyJWTToken(token: string): JWTPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      console.log("❌ JWT: Invalid format");
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(parts[1])) as JWTPayload;

    // Expiry kontrolü
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      console.log("❌ JWT: Token expired");
      return null;
    }
    return payload;
  } catch (error) {
    console.log("❌ JWT verification failed:", error);
    return null;
  }
}

/**
 * JWT-like token'ı decode eder (doğrulama yapmaz)
 */
export function decodeJWTToken(token: string): JWTPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(base64UrlDecode(parts[1])) as JWTPayload;
    return payload;
  } catch (error) {
    console.log("JWT decode failed:", error);
    return null;
  }
}

/**
 * Token'ın süresi dolmuş mu kontrol eder
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = decodeJWTToken(token);
    if (!decoded || !decoded.exp) return true;

    return Date.now() >= decoded.exp * 1000;
  } catch {
    return true;
  }
}
