import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        if (!token) return false;
        // In dev: reject sessions from a previous server run
        if (process.env.SESSION_VERSION && token.v !== process.env.SESSION_VERSION) {
          return false;
        }
        return true;
      },
    },
  }
);

// Protect all broker routes
export const config = {
  matcher: ["/dashboard/:path*", "/new-quote/:path*", "/search/:path*"],
};
