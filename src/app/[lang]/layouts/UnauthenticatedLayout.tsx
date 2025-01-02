'use client'

import AuthenticatedRoute from '@/components/AuthenticatedRoute'

export default function UnauthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthenticatedRoute>{children}</AuthenticatedRoute>
}
