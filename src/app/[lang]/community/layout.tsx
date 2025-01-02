import UnauthenticatedLayout from '../layouts/UnauthenticatedLayout'

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <UnauthenticatedLayout>{children}</UnauthenticatedLayout>
}
