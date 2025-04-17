import useStore from '@/stores/global_store'
import { PersonIdentifierType } from '@/types/PersonIdentifier'
import { PidComponent } from '@kit-data-manager/react-pid-component'
import { Paper, Typography } from '@mui/material'
import styles from './OrcidControl.module.css'

export default function OrcidControl() {
  const { connectedUser } = useStore((state) => state.user)
  const person = connectedUser?.person
  const identifiers = person?.getIdentifiers() ?? []
  const orcid = identifiers.find(
    (identifier) => identifier.type === PersonIdentifierType.ORCID,
  )?.value
  return (
    <Paper
      elevation={1}
      sx={{
        display: 'flex',
        alignItems: 'end',
        gap: 2,
        p: 2,
        width: '100%',
        borderRadius: 2,
      }}
    >
      <Typography
        variant='subtitle1'
        fontWeight='bold'
        sx={{ alignSelf: 'normal' }}
      >
        ORCID
      </Typography>
      <PidComponent
        value={orcid}
        emphasizeComponent={true}
        className={styles['pid-components']}
      />
    </Paper>
  )
}
