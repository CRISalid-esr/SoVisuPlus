import { Paper, Typography } from '@mui/material'
import useStore from '@/stores/global_store'
import { PersonIdentifierType } from '@/types/PersonIdentifier'
import { getRuntimeEnv } from '@/utils/runtimeEnv'

const redirectToCasLogin = ({
  casUrl,
  baseUrl,
  renew,
}: {
  casUrl: string
  baseUrl: string
  renew?: boolean
}) => {
  if (!casUrl) throw new Error('Missing NEXT_PUBLIC_CAS_URL')
  if (!baseUrl) throw new Error('Missing NEXT_PUBLIC_BASE_URL')

  const normalizedCasUrl = casUrl.replace(/\/$/, '')
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '')

  const serviceUrl = `${normalizedBaseUrl}/api/cas/login`

  let loginUrl = `${normalizedCasUrl}/login?service=${encodeURIComponent(
    serviceUrl,
  )}`

  if (renew) loginUrl += '&renew=true'

  window.location.href = loginUrl
}

const HalControl = () => {
  const env = getRuntimeEnv()
  const sovisuplusHost = env.NEXT_PUBLIC_BASE_URL
  const casUrl = env.NEXT_PUBLIC_CAS_URL

  const { connectedUser } = useStore((state) => state.user)
  const person = connectedUser?.person
  const identifiers = person?.getIdentifiers() ?? []

  const hal = identifiers.find(
    (identifier) => identifier.type === PersonIdentifierType.ID_HAL_S,
  )?.value

  return (
    <Paper
      elevation={1}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2,
        width: '100%',
        borderRadius: 2,
      }}
    >
      <Typography variant='subtitle1' fontWeight='bold'>
        Hal
      </Typography>

      {hal ? (
        <Typography variant='body2'>{hal}</Typography>
      ) : (
        <Typography variant='body2' color='text.secondary'>
          Not available
        </Typography>
      )}

      <button
        onClick={() =>
          redirectToCasLogin({
            casUrl,
            baseUrl: sovisuplusHost,
            renew: false,
          })
        }
      >
        Login
      </button>
    </Paper>
  )
}

export default HalControl
