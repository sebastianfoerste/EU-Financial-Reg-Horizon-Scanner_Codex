import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/(.*)",
  "/api/alerts(.*)",
  "/api/impact(.*)",
  "/api/integrations(.*)",
  "/api/review(.*)",
  "/api/sources(.*)",
]);

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/inngest(.*)",
  "/_next(.*)",
]);

const isUnauthenticatedSystemRoute = createRouteMatcher([
  "/api/inngest(.*)",
  "/_next(.*)",
]);

function clerkIsConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}

function permitsProductionDemoRead() {
  return (
    process.env.HORIZON_ALLOW_DEMO_MODE === "true" &&
    !process.env.DATABASE_URL
  );
}

const clerkProxy = clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request) && !isPublicRoute(request)) {
    await auth.protect();
  }
});

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!clerkIsConfigured()) {
    if (
      process.env.NODE_ENV === "production" &&
      !permitsProductionDemoRead() &&
      isProtectedRoute(request) &&
      !isUnauthenticatedSystemRoute(request)
    ) {
      return new NextResponse("Authentication configuration is required.", { status: 503 });
    }
    return NextResponse.next();
  }

  return clerkProxy(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api)(.*)",
  ],
};
