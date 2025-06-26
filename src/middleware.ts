import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJWTToken } from "./lib/jwt";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cookie'den token al
  const authToken = request.cookies.get("auth-token");

  // Header'dan da token kontrolü yap
  const authHeader = request.headers.get("authorization");

  // Herhangi birinden token varsa kabul et
  const hasToken = authToken?.value || authHeader;

  // Public sayfalar - bu sayfalara herkes erişebilir
  const publicPages = [
    "/login",
    "/register",
    "/setup-demo",
    "/", // Ana sayfa da public olsun
  ];

  const isPublicPage = publicPages.includes(pathname);

  // Sadece önemli durumları logla
  if (!hasToken && !isPublicPage) {
    console.log(`❌ Middleware - No token, redirecting from: ${pathname}`);
  }

  // Eğer public sayfaya erişiliyorsa, izin ver
  if (isPublicPage) {
    return NextResponse.next();
  }

  // Private sayfa erişimi için token kontrolü
  if (!hasToken) {
    // Token yoksa login'e yönlendir (hangi sayfadan geldiğini belirt)
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Token geçerlilik kontrolü
  const tokenValue = authToken?.value || authHeader;

  // JWT Token kontrolü
  if (tokenValue) {
    const decoded = verifyJWTToken(tokenValue);
    if (decoded) {
      return NextResponse.next();
    } else {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
