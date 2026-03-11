import { Paper, Typography } from '@mui/material'
import useStore from '@/stores/global_store'
import { Trans } from '@lingui/react'
import { Plural } from '@lingui/react/macro'
import React from 'react'

const StructuresControl = () => {
  const { connectedUser } = useStore((state) => state.user)
  const person = connectedUser?.person
  const structures = person?.membershipAcronyms ?? []
  const nbStructures = structures?.length || 0

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
          value={nbStructures}
          zero={`profile_affiliations_structure_label`}
          one={`profile_affiliations_structure_label`}
          other={`profile_affiliations_structures_label`}
        />
      </Typography>
      {nbStructures > 0 ? (
        <Typography key='structures' variant='body2' color='text.secondary'>
          {structures.join()}
        </Typography>
      ) : (
        <Typography
          key='structures'
          variant='body2'
          color='text.secondary'
          fontStyle={'italic'}
        >
          <Trans id='profile_affiliations_no_structures' />
        </Typography>
      )}
    </Paper>
  )
}
export default StructuresControl
