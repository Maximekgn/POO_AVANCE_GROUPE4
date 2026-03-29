import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("accessToken")?.value;
  const { pathname } = req.nextUrl;

  // Routes protégées qui nécessitent une authentification
  const protectedRoutes = [
    "/trips",
    "/locations",
    "/reservations",
    "/properties",
    "/finances",
    "/profile",
  ];

  const isAdminRoute = pathname.startsWith("/admin/dashboard");

  // Vérifier si la route est protégée
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );

  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Vérifier si la route admin nécessite des privilèges admin
  if (isAdminRoute) {
    if (!token) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Pour admin, on devrait vérifier le rôle mais nécessiterait de décoder le JWT
    // Pour l'instant, on laisse passer si token présent
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/trips/:path*",
    "/locations/:path*",
    "/reservations/:path*",
    "/properties/:path*",
    "/finances/:path*",
    "/profile/:path*",
    "/admin/dashboard/:path*",
  ],
};
