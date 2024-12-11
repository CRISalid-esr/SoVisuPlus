import DefaultLayout from '../layouts/MainLayout'

export default function InstitutionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DefaultLayout>{children}</DefaultLayout>
}
