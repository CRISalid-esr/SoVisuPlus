'use client'

import React, { useMemo } from 'react'
import { Box, Card, CardContent, Stack, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import Image from 'next/image'
import Link from 'next/link'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { SourceContribution } from '@/types/SourceContribution'
import { PersonIdentifierType as DbPersonIdentifierType } from '@prisma/client'

const IDENTIFIERS_TO_SHOW: DbPersonIdentifierType[] = [
  DbPersonIdentifierType.idhals,
  DbPersonIdentifierType.orcid,
  DbPersonIdentifierType.idref,
]

const initialsFromDisplayName = (displayName: string): string => {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '')
  return initials.join('') || 'N/C'
}

const SourceContributorIdentityCard = ({
  contributor,
}: {
  contributor: SourceContribution
}) => {
  const person = contributor.person
  const theme = useTheme()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const displayName = person.name

  const navigateToPerspective = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('perspective', slug)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }
  /*const identifiersToDisplay = useMemo(() => {
    return person
      .getIdentifiers()
      .filter((id) => IDENTIFIERS_TO_SHOW.includes(id.type))
  }, [person.getIdentifiers()])*/

  return (
    <Card
      sx={{
        borderRadius: 1,
        boxShadow: 1,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardContent sx={{ flex: 1, display: 'flex', py: 3 }}>
        <Stack
          alignItems='center'
          justifyContent='space-between'
          sx={{ flex: 1 }}
        >
          <Stack spacing={2.2} alignItems='center' sx={{ width: '100%' }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: theme.utils.pxToRem(22),
                userSelect: 'none',
                mb: 0.5,
              }}
            >
              {initialsFromDisplayName(displayName)}
            </Box>

            <Typography
              align='center'
              sx={{ fontWeight: 700, lineHeight: 1.25 }}
            >
              {displayName || 'N/C'}
            </Typography>
          </Stack>

          <Stack
            direction='row'
            spacing={1}
            justifyContent='center'
            sx={{ pt: 2, flexWrap: 'wrap' }}
          >
            {/*identifiersToDisplay.map((id) => {
              const href = id.getUrl()

              const badge = (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.2,
                    py: 0.4,
                    mt: 0.8,
                    borderRadius: 999,
                    bgcolor: theme.palette.action.hover,
                    border: `1px solid ${theme.palette.divider}`,
                    transition: 'background-color 120ms ease',
                    '&:hover': href
                      ? { bgcolor: theme.palette.action.selected }
                      : undefined,
                  }}
                >
                  <Image
                    src={id.getIcon()}
                    alt={id.getLabel()}
                    width={18}
                    height={18}
                  />
                  <Typography variant='caption' sx={{ whiteSpace: 'nowrap' }}>
                    {id.value}
                  </Typography>
                </Box>
              )

              return href ? (
                <Link
                  key={`${id.type}:${id.value}`}
                  href={href}
                  target='_blank'
                  rel='noopener noreferrer'
                  style={{ textDecoration: 'none' }}
                >
                  {badge}
                </Link>
              ) : (
                <Box key={`${id.type}:${id.value}`}>{badge}</Box>
              )
            })*/}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}
export default SourceContributorIdentityCard
