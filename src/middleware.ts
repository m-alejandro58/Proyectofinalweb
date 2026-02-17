import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const session = request.cookies.get('auth_session')

    // Routes to protect
    const protectedRoutes = ['/dashboard', '/inventory', '/sales', '/purchases', '/contacts', '/accounts', '/expense', '/orders']
    const isProtected = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route)) || request.nextUrl.pathname === "/"

    // If trying to access protected route without session
    if (isProtected && !session) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // If already logged in and trying to access login
    if (request.nextUrl.pathname === '/login' && session) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
