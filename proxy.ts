import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionCookie } from "./lib/session-cookie";
import security from "./lib/security";

// Simple in-memory rate limiter (per IP) — suitable for single-instance/dev only
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 300); // requests per window
const ipMap: Map<string, number[]> = new Map();

function getIp(req: NextRequest) {
  const xfwd = req.headers.get("x-forwarded-for");
  if (xfwd) return xfwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function createCsrfToken() {
  const gw = globalThis as unknown as {
    crypto?: { randomUUID?: () => string };
  };
  return (
    gw.crypto?.randomUUID?.() ||
    String(Date.now()) + Math.random().toString(36).slice(2)
  );
}

function ensureCsrfCookie(response: NextResponse, hasCookie: boolean) {
  if (hasCookie) return response;
  response.cookies.set("csrfToken", createCsrfToken(), {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

export async function proxy(
  req: NextRequest,
): Promise<import("next/server").NextResponse> {
  try {
    // --- Middleware: rate limiting + CSRF + audit logging ---
    const ip = getIp(req);
    const now = Date.now();
    const arr = ipMap.get(ip) || [];
    // drop old
    const filtered = arr.filter((t) => t > now - RATE_LIMIT_WINDOW_MS);
    filtered.push(now);
    ipMap.set(ip, filtered);
    if (filtered.length > RATE_LIMIT_MAX) {
      security.logSecurityEvent("warning", "rate_limit_exceeded", {
        ip,
        count: filtered.length,
      });
      return new NextResponse(
        JSON.stringify({ error: "rate_limit_exceeded" }),
        { status: 429, headers: { "content-type": "application/json" } },
      );
    }

    // IP logging to audit
    security.logAudit(null, null, "request", "ip", ip, {
      method: req.method,
      path: req.nextUrl.pathname,
    });

    // CSRF protection for unsafe methods
    const method = req.method.toUpperCase();
    const hasCsrfCookie = Boolean(req.cookies.get("csrfToken")?.value);
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      const header = req.headers.get("x-csrf-token");
      const csrfCookie = req.cookies.get("csrfToken")?.value;
      const origin = req.headers.get("origin");
      const sameOrigin = !origin || origin === req.nextUrl.origin;
      if ((!header || !csrfCookie || header !== csrfCookie) && !sameOrigin) {
        security.logSecurityEvent("warning", "csrf_token_mismatch", {
          ip,
          method,
          path: req.nextUrl.pathname,
        });
        return new NextResponse(JSON.stringify({ error: "csrf_failed" }), {
          status: 403,
          headers: { "content-type": "application/json" },
        });
      }
    }

    // --- Original proxy auth/onboarding/role checks ---
    const { pathname } = req.nextUrl;
    const isAuthPage =
      pathname === "/login" ||
      pathname === "/register" ||
      pathname === "/forgot-password" ||
      pathname === "/reset-password" ||
      pathname === "/verify-email";

    const isOnboardingPage = pathname === "/onboarding";

    const isProtectedPage =
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/staff") ||
      pathname.startsWith("/reports") ||
      pathname.startsWith("/admin");
    const isProtectedApi = pathname.startsWith("/api/admin");

    // Extract session token from cookie
    const sessionCookie = req.cookies.get("kq_session")?.value;
    const payload = await verifySessionCookie(sessionCookie);

    if (!payload) {
      // not authenticated
      if (isProtectedApi) {
        return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        });
      }
      if (isProtectedPage || isOnboardingPage) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return ensureCsrfCookie(NextResponse.redirect(loginUrl), hasCsrfCookie);
      }
      return ensureCsrfCookie(NextResponse.next(), hasCsrfCookie);
    }

    // 2. If authenticated and on an auth page, redirect to dashboard
    if (isAuthPage) {
      return ensureCsrfCookie(
        NextResponse.redirect(new URL("/dashboard", req.url)),
        hasCsrfCookie,
      );
    }

    // 3. If authenticated, check onboarding status for passenger
    const { role, onboardingCompleted } = payload;

    if (role === "PASSENGER" && !onboardingCompleted) {
      // If onboarding is incomplete and they are not on the onboarding page, redirect to onboarding
      if (!isOnboardingPage && isProtectedPage) {
        return ensureCsrfCookie(
          NextResponse.redirect(new URL("/onboarding", req.url)),
          hasCsrfCookie,
        );
      }
    } else {
      // If onboarding is complete (or role is staff/admin) and they try to go to onboarding, redirect to dashboard
      if (isOnboardingPage) {
        return ensureCsrfCookie(
          NextResponse.redirect(new URL("/dashboard", req.url)),
          hasCsrfCookie,
        );
      }
    }

    // 4. Role-based checks
    if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
      if (role !== "ADMIN") {
        if (pathname.startsWith("/api/")) {
          return new NextResponse(JSON.stringify({ error: "forbidden" }), {
            status: 403,
            headers: { "content-type": "application/json" },
          });
        }
        // Forbidden: redirect passengers back to dashboard
        return ensureCsrfCookie(
          NextResponse.redirect(new URL("/dashboard", req.url)),
          hasCsrfCookie,
        );
      }
    }

    if (pathname.startsWith("/staff") || pathname.startsWith("/reports")) {
      if (role !== "STAFF" && role !== "ADMIN") {
        return ensureCsrfCookie(
          NextResponse.redirect(new URL("/dashboard", req.url)),
          hasCsrfCookie,
        );
      }
    }

    return ensureCsrfCookie(NextResponse.next(), hasCsrfCookie);
  } catch (e: unknown) {
    security.logSecurityEvent("critical", "proxy_error", {
      error: String(e),
    });
    return NextResponse.next();
  }
}

// Combined matcher: middleware previously matched API/admin; proxy matched auth/dashboard paths
export const config = {
  matcher: [
    "/api/:path*",
    "/admin/:path*",
    "/dashboard/:path*",
    "/staff/:path*",
    "/reports/:path*",
    "/onboarding",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
  ],
};
