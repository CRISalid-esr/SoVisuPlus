import { Paper, Typography } from '@mui/material'
import useStore from '@/stores/global_store'
import { PersonIdentifierType } from '@/types/PersonIdentifier'
import { login } from 'next-cas-client'
import { getRuntimeEnv } from '@/utils/runtimeEnv'

const HalControl = () => {
  const sovisuplusHost = getRuntimeEnv().NEXT_PUBLIC_BASE_URL
  const casUrl = getRuntimeEnv().NEXT_PUBLIC_CAS_URL
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
      <button onClick={() => login()}>Login</button>;
    </Paper>
  )
}
export default HalControl
