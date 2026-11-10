import { Paper, Typography } from '@mui/material'
import useStore from '@/stores/global_store'
import { isPerson } from '@/types/Person'
import { Trans } from '@lingui/react'
import { Plural } from '@lingui/react/macro'
import React from 'react'

const UnitsControl = () => {
  const { connectedUser, currentPerspective, ownPerspective } = useStore(
    (state) => state.user,
  )
  // When viewing another person's account, read their affiliations from currentPerspective
  const person =
    ownPerspective || !currentPerspective || !isPerson(currentPerspective)
      ? connectedUser?.person
      : currentPerspective
  const units = person?.membershipAcronyms ?? []
  const nbUnits = units?.length || 0

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
        <Plural
          value={nbUnits}
          zero={`profile_affiliations_unit_label`}
          one={`profile_affiliations_unit_label`}
          other={`profile_affiliations_units_label`}
        />
      </Typography>
      {nbUnits > 0 ? (
        <Typography key='units' variant='body2' color='text.secondary'>
          {units.join()}
        </Typography>
      ) : (
        <Typography
          key='units'
          variant='body2'
          color='text.secondary'
          fontStyle={'italic'}
        >
          <Trans id='profile_affiliations_no_units' />
        </Typography>
      )}
    </Paper>
  )
}
export default UnitsControl
