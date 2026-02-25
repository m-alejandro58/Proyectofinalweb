import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public routes that DON'T require authentication
const PUBLIC_ROUTES = ['/login']

export function middleware(request: NextRequest) {
    const session = request.cookies.get('auth_session')
    const { pathname } = request.nextUrl

    // Check if current path is public
    const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route))

    // If trying to access ANY non-public route without session → redirect to login
    if (!isPublicRoute && !session) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // Validate session has a value (not empty cookie)
    if (!isPublicRoute && session && !session.value) {
        const response = NextResponse.redirect(new URL('/login', request.url))
        response.cookies.delete('auth_session')
        return response
    }

    // If already logged in and trying to access login → redirect to home
    if (pathname === '/login' && session?.value) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    return NextResponse.next()
}

export const config = {
    // Protect ALL routes except static files, images, and API routes
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
