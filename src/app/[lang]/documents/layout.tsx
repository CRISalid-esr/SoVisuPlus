import DefaultLayout from '../layouts/MainLayout'

export default function DocumentsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DefaultLayout>{children}</DefaultLayout>
}
