import { Link, Paper, Typography } from '@mui/material'
import useStore from '@/stores/global_store'
import { PersonIdentifierType as DbPersonIdentifierType } from '@prisma/client'

const IdrefControl = () => {
  const { connectedUser } = useStore((state) => state.user)
  const person = connectedUser?.person
  const identifiers = person?.getIdentifiers() ?? []
  const idref = identifiers.find(
    (identifier) => identifier.type === DbPersonIdentifierType.idref,
  )?.value

  const idrefUrl = idref ? `https://www.idref.fr/${idref}` : null

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
        IdRef
      </Typography>
      {idref && idrefUrl ? (
        <Link href={idrefUrl} target='_blank' rel='noopener' underline='hover'>
          {idref}
        </Link>
      ) : (
        <Typography variant='body2' color='text.secondary'>
          Not available
        </Typography>
      )}
    </Paper>
  )
}
export default IdrefControl
