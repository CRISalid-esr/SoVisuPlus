import UnauthenticatedLayout from '../layouts/UnauthenticatedLayout'

const FaqLayout = ({ children }: { children: React.ReactNode }) => (
  <UnauthenticatedLayout>{children}</UnauthenticatedLayout>
)
export default FaqLayout
