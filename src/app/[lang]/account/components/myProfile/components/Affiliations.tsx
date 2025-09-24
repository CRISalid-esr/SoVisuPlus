import { Box, CardContent, List, ListItem, Typography } from '@mui/material'
import React from 'react'
import { useTheme } from '@mui/material/styles'
import { Trans } from '@lingui/react'
import { CustomCard } from '@/components/Card'
import SignatureControl from '@/app/[lang]/account/components/myProfile/components/affiliations/SignatureControl'
import LaboratoriesControl from '@/app/[lang]/account/components/myProfile/components/affiliations/LaboratoriesControl'

export default function Affiliations() {
  const theme = useTheme()

  return (
    <CustomCard
      header={
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography
            sx={{
              color: theme.palette.primary.main,
              fontSize: theme.utils.pxToRem(20),
              fontStyle: 'normal',
              fontWeight: theme.typography.fontWeightRegular,
              lineHeight: 'normal',
            }}
          >
            <Trans id='profile_affiliations_card_title' />
          </Typography>
        </Box>
      }
    >
      <CardContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: theme.spacing(4),
        }}
      >
        <Box
          sx={{
            padding: theme.spacing(2),
            width: '100%',
          }}
        >
          <List
            sx={{
              width: '100%',
              padding: 0,
            }}
          >
            <Box
              key='laboratories'
              sx={{
                width: '100%',
                borderBottom: `1px solid ${theme.palette.divider}`,
              }}
            >
              <ListItem
                disableGutters
                sx={{
                  paddingY: theme.spacing(2),
                  paddingX: theme.spacing(2),
                  width: '100%',
                }}
              >
                <LaboratoriesControl />
              </ListItem>
            </Box>
            <Box
              key='signature'
              sx={{
                width: '100%',
              }}
            >
              <ListItem
                disableGutters
                sx={{
                  paddingY: theme.spacing(2),
                  paddingX: theme.spacing(2),
                  width: '100%',
                }}
              >
                <SignatureControl />
              </ListItem>
            </Box>
          </List>
        </Box>
      </CardContent>
    </CustomCard>
  )
}
