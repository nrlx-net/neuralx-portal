export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/cuentas/:path*',
    '/movimientos/:path*',
    '/solicitudes/:path*',
    '/perfil/:path*',
    '/datos-bancarios/:path*',
    '/transferir/:path*',
    '/regulatorio/:path*',
    '/admin/:path*',
  ],
}
