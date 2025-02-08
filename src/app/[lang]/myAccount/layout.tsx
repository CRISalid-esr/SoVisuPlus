import DefaultLayout from '../layouts/MainLayout'

export default function MyAccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DefaultLayout>{children}</DefaultLayout>
}
