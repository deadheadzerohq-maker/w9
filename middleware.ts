// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Only protect /admin routes
  if (!url.pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  // If env vars are missing, don't block access (useful during local dev)
  if (!username || !password) {
    console.error(
      "ADMIN_USERNAME or ADMIN_PASSWORD not set. /admin routes are NOT protected.",
    );
    return NextResponse.next();
  }

  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    return new Response("Authentication required", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Admin Area"',
      },
    });
  }

  const [scheme, encoded] = authHeader.split(" ");

  if (scheme !== "Basic" || !encoded) {
    return new Response("Invalid authorization header", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Admin Area"',
      },
    });
  }

  // Decode "username:password" from base64
  const decoded = atob(encoded);
  const [user, pass] = decoded.split(":");

  if (user === username && pass === password) {
    // Auth OK – let the request through
    return NextResponse.next();
  }

  return new Response("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Admin Area"',
    },
  });
}

// Apply to all /admin routes
export const config = {
  matcher: ["/admin/:path*"],
};
