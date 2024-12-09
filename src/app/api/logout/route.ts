import { NextResponse } from 'next/server'

export const GET = async () => {
  return NextResponse.redirect(
    `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/logout?redirect_uri=${encodeURIComponent('/')}`,
  )
}
