// app/not-found.tsx
import ErrorBoundary from '@/components/ErrorBoundary'
import ErrorFallback from '@/components/ErrorFallback'
import { Box } from '@mui/system'

const NotFound = () => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Box component={'div'}>
        <Box component={'h1'}>404 - Page Not Found</Box>
        <Box component={'p'}>
          Sorry, we couldn t find the page you re looking for.
        </Box>
      </Box>
    </ErrorBoundary>
  )
}

export default NotFound
