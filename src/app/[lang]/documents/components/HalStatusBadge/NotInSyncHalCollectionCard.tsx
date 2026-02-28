'use client'

import React from 'react'
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  IconButton,
  Link,
  Stack,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { Plural, Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Cached, Close, OpenInNew } from '@mui/icons-material'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export type NotInSyncHalCollectionCardProps = {
  update: boolean
  acronyms: string[] | null
  icon?: React.ReactElement | null
  halSubmitTypeStr: string | null
  isOutOfCollection: boolean
  halUrl: string | null
  onClose: () => void
  documentUid: string | null
}

const NotInSyncHalCollectionCard = ({
  icon,
  update,
  acronyms,
  halSubmitTypeStr,
  isOutOfCollection,
  halUrl,
  onClose,
  documentUid,
}: NotInSyncHalCollectionCardProps) => {
  const theme = useTheme()
  const router = useRouter()
  const pathname = usePathname()
  const lang = pathname.split('/')[1]
  const searchParams = useSearchParams()
  const numberOfAcronyms = acronyms?.length || 0
  const formattedAcronyms = acronyms?.join(', ') || ''

  const navigateToAuthorsPage = () => {
    if (documentUid) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', 'authors')
      router.push(`/${lang}/documents/${documentUid}?${params.toString()}`)
    }
  }

  const navigateToUpdateInHALPage = () => {
    if (documentUid) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', 'update_in_hal')
      router.push(`/${lang}/documents/${documentUid}?${params.toString()}`)
    }
  }

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
        width: '350px',
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
                color: '#0398fc',
                gap: 1,
              }}
            >
              {icon}
              <Typography
                align='center'
                sx={{ fontWeight: 700, lineHeight: 1.25 }}
              >
                {t`documents_page_hal_status_in_hal`}
              </Typography>
            </Box>
            <IconButton onClick={onClose}>
              <Close />
            </IconButton>
          </Box>
        }
        slotProps={{
          title: {
            sx: {
              color: 'info',
            },
          },
        }}
      />
      <Divider />
      <CardContent>
        <Stack spacing={theme.spacing(2)}>
          <Typography sx={{ wordBreak: 'break-word' }}>
            {halSubmitTypeStr}
          </Typography>

          {isOutOfCollection && (
            <Stack alignItems='center' spacing={theme.spacing(2)}>
              <Alert severity='warning' sx={{ wordBreak: 'break-word' }}>
                <AlertTitle>
                  <Plural
                    value={numberOfAcronyms}
                    one={`documents_page_hal_status_badge_outside_collection_tooltip_card_info_box_header`}
                    other={`documents_page_hal_status_badge_outside_collections_tooltip_card_info_box_header`}
                  />
                </AlertTitle>
                <Box sx={{ alignItems: 'center' }}>
                  <Plural
                    value={numberOfAcronyms}
                    one={`${halSubmitTypeStr} documents_page_hal_status_badge_outside_collection_tooltip_card_info_box_message ${formattedAcronyms}`}
                    other={`${halSubmitTypeStr} documents_page_hal_status_badge_outside_collections_tooltip_card_info_box_message ${formattedAcronyms}`}
                  />
                  {t`documents_page_hal_status_badge_outside_collection_tooltip_card_info_box_link`}
                  <Link
                    component={'button'}
                    onClick={navigateToAuthorsPage}
                    sx={{ padding: 0, verticalAlign: 'baseline' }}
                    aria-label='see affiliation'
                  ></Link>
                </Box>
              </Alert>
            </Stack>
          )}

          {halUrl && update && (
            <Stack alignItems='center' spacing={theme.spacing(2)}>
              <Alert severity='info' sx={{ wordBreak: 'break-word' }}>
                <AlertTitle>{t`documents_page_hal_status_badge_not_in_sync_with_hal_tooltip_card_info_box_header`}</AlertTitle>
                {t`documents_page_hal_status_badge_not_in_sync_with_hal_tooltip_card_info_box_message`}
              </Alert>
              <Button
                variant={'contained'}
                sx={{ wordBreak: 'break-word', width: '100%' }}
                onClick={navigateToUpdateInHALPage}
                startIcon={<Cached sx={{ transform: 'scaleY(-1)' }} />}
              >
                <Trans>
                  documents_page_hal_status_badge_not_in_sync_with_hal_tooltip_card_update_button
                </Trans>
              </Button>
            </Stack>
          )}

          {halUrl && (
            <Button
              variant={'outlined'}
              sx={{ wordBreak: 'break-word', width: '100%' }}
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
export default NotInSyncHalCollectionCard
