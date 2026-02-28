import UnauthenticatedLayout from '../layouts/UnauthenticatedLayout'

const CommunityLayout = ({ children }: { children: React.ReactNode }) => (
  <UnauthenticatedLayout>{children}</UnauthenticatedLayout>
)
export default CommunityLayout
