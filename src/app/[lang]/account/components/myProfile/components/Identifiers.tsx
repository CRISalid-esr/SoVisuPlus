import { Box, CardContent, List, ListItem, Typography } from '@mui/material'
import React from 'react'
import { useTheme } from '@mui/material/styles'
import { Trans } from '@lingui/react'
import { CustomCard } from '@/components/Card'
import { PersonIdentifierType } from '@/types/PersonIdentifier'
import { identifierComponentMap } from '@/app/[lang]/account/components/myProfile/components/identifiers'

export default function Identifiers() {
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
            <Trans id='profile_identifiers_card_title' />
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
            {Object.values(PersonIdentifierType).map((type, index, array) => {
              const Control = identifierComponentMap[type]
              const isLast = index === array.length - 1
              if (!Control) {
                return null
              }

              return (
                <Box
                  key={type}
                  sx={{
                    width: '100%',
                    borderBottom: isLast
                      ? 'none'
                      : `1px solid ${theme.palette.divider}`,
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
                    <Control />
                  </ListItem>
                </Box>
              )
            })}
          </List>
        </Box>
      </CardContent>
    </CustomCard>
  )
}
