import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function proxy(req) {
    const isAdminRoute = req.nextUrl.pathname.startsWith("/admin/dashboard");
    if (!isAdminRoute) {
      return NextResponse.next();
    }

    const isAdmin = Boolean((req as any).nextauth?.token?.isAdmin);
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
);

export const config = {
  matcher: [
    "/trips",
    "/locations",
    "/reservations",
    "/properties",
    "/finances",
    "/favorites",
    "/admin/dashboard/:path*",
  ],
};
