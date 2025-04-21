import DefaultLayout from '../layouts/MainLayout'

export default function MyGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DefaultLayout>{children}</DefaultLayout>
}
