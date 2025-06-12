import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authToken = request.cookies.get("auth-token");

  // Public sayfalar
  const publicPages = ["/login", "/register"];
  const isPublicPage = publicPages.includes(pathname);

  // Eğer kullanıcı giriş yapmışsa ve public sayfaya erişmeye çalışıyorsa
  if (authToken && isPublicPage) {
    // Ana sayfaya yönlendir
    const response = NextResponse.redirect(new URL("/", request.url));
    // Cache'i temizle
    response.headers.set("Cache-Control", "no-store, must-revalidate");
    return response;
  }

  // Eğer kullanıcı giriş yapmamışsa ve private sayfaya erişmeye çalışıyorsa
  if (!authToken && !isPublicPage) {
    // Login sayfasına yönlendir
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    const response = NextResponse.redirect(loginUrl);
    // Cache'i temizle
    response.headers.set("Cache-Control", "no-store, must-revalidate");
    return response;
  }

  // Normal sayfa yüklemesi
  const response = NextResponse.next();
  // Cache'i temizle
  response.headers.set("Cache-Control", "no-store, must-revalidate");
  return response;
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
