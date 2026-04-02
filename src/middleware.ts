import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    // Si no tiene la cookie "auth_session", no puede pasar
    const session = request.cookies.get('auth_session')?.value

    if (!session) {
        // Redirigir a login preservando la URL que intentaba visitar (opcional)
        return NextResponse.redirect(new URL('/login', request.url))
    }

    return NextResponse.next()
}

export const config = {
    // Excluir: /api (las APIs las validamos manualmente por DB roles), 
    // /_next/static, /_next/image, favicon e iconos, y la página de /login
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login).*)'],
}
