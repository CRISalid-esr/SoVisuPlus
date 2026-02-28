'use client'

import AuthenticatedRoute from '@/components/AuthenticatedRoute'

const UnauthenticatedLayout = ({ children }: { children: React.ReactNode }) => (
  <AuthenticatedRoute>{children}</AuthenticatedRoute>
)
export default UnauthenticatedLayout
