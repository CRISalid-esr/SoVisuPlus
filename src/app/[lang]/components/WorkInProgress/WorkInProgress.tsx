'use client'

import * as React from 'react'
import { Box, Stack, Typography } from '@mui/material'
import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded'
import HourglassEmptyRoundedIcon from '@mui/icons-material/HourglassEmptyRounded'
import { useTheme } from '@mui/material/styles'
import { t } from '@lingui/macro'

export type WorkInProgressVariant = 'page' | 'inline'

export interface WorkInProgressProps {
  title?: string
  description?: string
  variant?: WorkInProgressVariant
  dense?: boolean
  icon?: React.ReactNode
}

export default function WorkInProgress({
  title = 'Work in progress',
  description = 'This section is being built. Some features may be missing or change.',
  variant = 'page',
  dense = false,
  icon,
}: WorkInProgressProps) {
  const theme = useTheme()
  const isPage = variant === 'page'

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    isPage ? (
      <Box
        role='status'
        aria-live='polite'
        sx={{
          minHeight: '50vh',
          display: 'grid',
          placeItems: 'center',
          px: 2,
        }}
      >
        {children}
      </Box>
    ) : (
      <Box role='status' aria-live='polite'>
        {children}
      </Box>
    )

  return (
    <Wrapper>
      <Stack
        spacing={dense ? 1.5 : 2.5}
        alignItems='center'
        textAlign='center'
        sx={{
          maxWidth: 680,
          width: '100%',
          mx: 'auto',
          py: isPage ? (dense ? 2 : 6) : dense ? 1 : 2,
        }}
      >
        <Box
          aria-hidden={true}
          sx={{
            width: 72,
            height: 72,
            display: 'grid',
            placeItems: 'center',
            borderRadius: '50%',
            boxShadow: theme.shadows[1],
          }}
        >
          {icon ?? <ConstructionRoundedIcon fontSize='large' />}
        </Box>

        <Stack spacing={1}>
          <Typography variant={isPage ? 'h4' : 'h6'} fontWeight={600}>
            {title}
          </Typography>
          <Typography variant='body1' color='text.secondary'>
            {description}
          </Typography>
        </Stack>

        <Stack
          spacing={1}
          sx={{ width: '100%', maxWidth: 520, mx: 'auto' }}
          alignItems='center'
          justifyContent='center'
        >
          <Stack
            direction='row'
            spacing={1}
            alignItems='center'
            justifyContent='center'
          >
            <HourglassEmptyRoundedIcon fontSize='small' aria-hidden />
            <Typography variant='body2' color='text.secondary'>
              {t`wip_component_coming_soon`}
            </Typography>
          </Stack>
        </Stack>
      </Stack>
    </Wrapper>
  )
}
