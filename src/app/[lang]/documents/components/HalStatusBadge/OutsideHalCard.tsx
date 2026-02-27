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
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Close, SaveAlt } from '@mui/icons-material'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export type OutsideHalCardProps = {
  onClose: () => void
  documentUid: string | null
}

const OutsideHalCard = ({ onClose, documentUid }: OutsideHalCardProps) => {
  const theme = useTheme()
  const router = useRouter()
  const pathname = usePathname()
  const lang = pathname.split('/')[1]
  const searchParams = useSearchParams()

  const navigateToAddInHALPage = () => {
    if (documentUid) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', 'add_in_hal')
      router.push(`/${lang}/documents/${documentUid}?${params.toString()}`)
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
            <Typography
              align='center'
              sx={{
                fontSize: '14px',
                fontWeight: 700,
                lineHeight: 1.25,
                color: '#cf1f28',
              }}
            >
              {t`documents_page_hal_status_outside_hal`}
            </Typography>
            <IconButton onClick={onClose}>
              <Close fontSize='small' />
            </IconButton>
          </Box>
        }
      />
      <Divider />
      <CardContent>
        <Stack alignItems='center' spacing={theme.spacing(2)}>
          <Alert
            severity='info'
            sx={{
              wordBreak: 'break-word',
              width: '100%',
              backgroundColor: 'transparent',
            }}
          >
            <AlertTitle
              sx={{ fontSize: '12px' }}
            >{t`documents_page_hal_status_badge_not_in_hal_tooltip_card_info_box_header`}</AlertTitle>
          </Alert>
          <Typography sx={{ fontSize: '12px', wordBreak: 'break-word' }}>
            {t`documents_page_hal_status_badge_tooltip_card_not_in_hal_label`}
          </Typography>
          <Button
            variant={'contained'}
            sx={{ fontSize: '12px', wordBreak: 'break-word' }}
            onClick={navigateToAddInHALPage}
            startIcon={<SaveAlt />}
          >
            <Trans>
              documents_page_hal_status_badge_not_in_hal_tooltip_card_download_button
            </Trans>
          </Button>
          <Typography
            sx={{ fontSize: '12px', wordBreak: 'break-word', gap: 1 }}
          >
            {t`documents_page_hal_status_badge_tooltip_card_not_in_hal_go_to_profile_label` +
              ' '}
            <Link
              component='button'
              onClick={() => router.push(`/${lang}/account`)}
            >{t`documents_page_hal_status_badge_tooltip_card_not_in_hal_go_to_profile_link`}</Link>
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  )
}
export default OutsideHalCard
