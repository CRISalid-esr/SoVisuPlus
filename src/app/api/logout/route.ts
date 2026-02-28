import { NextResponse } from 'next/server'

export const GET = async () => {
  return NextResponse.redirect(
    `${process.env.KEYCLOAK_PUBLIC_URL}/protocol/openid-connect/logout?redirect_uri=${encodeURIComponent('/')}`,
  )
}
