import { Paper, Typography } from '@mui/material'
import useStore from '@/stores/global_store'
import { Trans } from '@lingui/react'

export default function LaboratoriesControl() {
  const { connectedUser } = useStore((state) => state.user)
  const person = connectedUser?.person
  const laboratories = person?.membershipAcronyms ?? []

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
        <Trans id='profile_affiliations_laboratories_label' />
      </Typography>
      <Typography key='laboratories' variant='body2' color='text.secondary'>
        {laboratories.join()}
      </Typography>
    </Paper>
  )
}
