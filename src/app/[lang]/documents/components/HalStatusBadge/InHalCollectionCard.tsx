'use client'

import React from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { Plural, Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Close, OpenInNew } from '@mui/icons-material'

export type InHalCollectionCardProps = {
  icon?: React.ReactElement | null
  acronyms: string[]
  halSubmitTypeStr: string | null
  halUrl: string | null
  onClose: () => void
}

const InHalCollectionCard = ({
  icon,
  acronyms,
  halSubmitTypeStr,
  halUrl,
  onClose,
}: InHalCollectionCardProps) => {
  const theme = useTheme()
  const numberOfAcronyms = acronyms.length
  const formattedAcronyms = acronyms.join(', ')

  const seeHalFile = () => {
    if (halUrl) {
      window.open(halUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <Card
      sx={{
        borderRadius: 1,
        boxShadow: 1,
        display: 'flex',
        flexDirection: 'column',
        width: '320px',
        padding: theme.spacing(1),
      }}
    >
      <CardHeader
        title={
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'start',
                color: '#1b7a1e',
                gap: 1,
                fontSize: '14px',
              }}
            >
              {icon}
              <Typography
                align='center'
                sx={{ fontWeight: 700, lineHeight: 1.25, color: 'info' }}
              >
                {t`documents_page_hal_status_in_hal`}
              </Typography>
            </Box>
            <IconButton onClick={onClose}>
              <Close fontSize={'small'} />
            </IconButton>
          </Box>
        }
      />
      <Divider />
      <CardContent>
        <Stack alignItems='center' spacing={theme.spacing(2)}>
          <Typography sx={{ fontSize: '12px', wordBreak: 'break-word' }}>
            <Plural
              value={numberOfAcronyms}
              one={`${halSubmitTypeStr} documents_page_hal_status_badge_in_hal_collection_tooltip_card_file_collection_label ${formattedAcronyms}`}
              other={`${halSubmitTypeStr} documents_page_hal_status_badge_in_hal_collection_tooltip_card_file_collections_label ${formattedAcronyms}`}
            />
          </Typography>

          {halUrl && (
            <Button
              variant={'outlined'}
              sx={{ fontSize: '12px', wordBreak: 'break-word' }}
              onClick={seeHalFile}
              startIcon={<OpenInNew />}
            >
              <Trans>
                documents_page_hal_status_badge_tooltip_card_see_file
              </Trans>
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}
export default InHalCollectionCard
