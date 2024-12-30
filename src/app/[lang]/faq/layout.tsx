import UnauthenticatedLayout from '../layouts/UnauthenticatedLayout'

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return <UnauthenticatedLayout>{children}</UnauthenticatedLayout>
}
