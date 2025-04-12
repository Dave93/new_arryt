// frontend/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "./lib/eden-client";


// Combined middleware
export async function middleware(request: NextRequest) {
    // First, handle the authentication check
    const sessionKey = request.cookies.get("session")?.value;
    const isLoginRoute = request.nextUrl.pathname === '/auth/login' ||
        request.nextUrl.pathname.match(/^\/(de|en)\/login$/) !== null;
    const isForbiddenRoute = request.nextUrl.pathname === '/forbidden' ||
        request.nextUrl.pathname.match(/^\/(de|en)\/forbidden$/) !== null;

    // Skip auth check for login page and forbidden page
    if (isLoginRoute || isForbiddenRoute) {
        return NextResponse.next();
    }

    // If no session, redirect to login
    if (!sessionKey) {
        return NextResponse.redirect(new URL(`/auth/login`, request.url));
    }

    // Verify session with backend
    const { status } = await apiClient.api.users.me.get({
        headers: {
            Cookie: `session=${sessionKey}`,
        },
    });

    if (status !== 200) {
        return NextResponse.redirect(new URL(`/auth/login`, request.url));
    }

    // const { status: permissionsStatus, data: permissionsData } = await apiClient.api.users.permissions.get({
    //     headers: {
    //         Cookie: `session=${sessionKey}`,
    //     },
    // });

    // if (permissionsStatus !== 200) {
    //     return NextResponse.redirect(new URL(`/login`, request.url));
    // }

    // If authenticated, apply the intl middleware
    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Include internationalized paths
         */
        '/((?!api|_next/static|_next/image|favicon\\.ico).*)',
        '/',
        '/(de|en)/:path*'
    ],
};