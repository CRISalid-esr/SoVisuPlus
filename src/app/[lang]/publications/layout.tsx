  import DefaultLayout from '../layouts/MainLayout'

export default function PublicationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DefaultLayout>{children}</DefaultLayout>
}