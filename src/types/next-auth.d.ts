import 'next-auth'

declare module 'next-auth' {
  interface Session {
    accessToken?: string
    user: {
      name?: string | null
      email?: string | null
      image?: string | null
      upn?: string
      oid?: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    idToken?: string
    upn?: string
    oid?: string
  }
}
