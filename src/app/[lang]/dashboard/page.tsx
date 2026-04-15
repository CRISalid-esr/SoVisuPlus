'use client'

import { defineMessage, t } from '@lingui/core/macro'
import * as Lingui from '@lingui/core'
import { MessageDescriptor } from '@lingui/core'
import {
  Box,
  Button,
  CardContent,
  Grid2 as Grid,
  MenuItem,
  Select,
  Slider,
  Stack,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import useStore from '@/stores/global_store'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import DocumentHeader from '@/app/[lang]/documents/components/DocumentHeader'
import { CustomCard } from '@/components/Card'
import WordStream from '@/app/[lang]/components/WordStream/WordStream'
import { useLingui } from '@lingui/react'
import React, { useEffect, useState } from 'react'
import { WordstreamTopic } from '@/types/WordStream'
import PublicationCard from '@/app/[lang]/dashboard/components/PublicationCard'
import AgentIdentityCard from '@/app/[lang]/dashboard/components/AgentIdentityCard'
import {
  OAStatus,
  PersonIdentifierType as DbPersonIdentifierType,
} from '@prisma/client'
import CollaborationMap from '@/app/[lang]/dashboard/components/CollaborationMap'

const DEFAULT_TOP_N = 10
const DEFAULT_START_YEAR = 2010
const DEFAULT_MIN_FONT = 15
const DEFAULT_MAX_FONT = 30

const IDENTIFIERS_TO_SHOW: DbPersonIdentifierType[] = [
  DbPersonIdentifierType.idhals,
  DbPersonIdentifierType.orcid,
  DbPersonIdentifierType.idref,
]

const DashboardPage = () => {
  const theme = useTheme()
  const { _ } = useLingui()
  const { currentPerspective } = useStore((state) => state.user)
  const [documents, setDocuments] = useState<
    Record<
      number,
      {
        uid: string
        oaStatus: OAStatus | null
        publicationDate: string | null
        upwOAStatus: OAStatus | null
        contributions: {
          person: {
            uid: string
            displayName: string | null
          }
          affiliations: {
            uid: string
            displayNames: string[]
            places: {
              latitude: number
              longitude: number
            }[]
          }[]
        }[]
      }[]
    >
  >([])
  const [loading, setLoading] = useState(false)
  const lang = (Lingui.i18n.locale || 'ul') as ExtendedLanguageCode
  const entityType = currentPerspective?.type
  const uid = currentPerspective?.uid
  const displayName = currentPerspective?.getDisplayName(lang) || ''

  const currentYear = new Date().getUTCFullYear()

  const [pendingWSTopN, setPendingWSTopN] = useState<number>(DEFAULT_TOP_N)
  const [pendingWSFontRange, setPendingWSFontRange] = useState<
    [number, number]
  >([DEFAULT_MIN_FONT, DEFAULT_MAX_FONT])
  const [pendingWSYearRange, setPendingWSYearRange] = useState<
    [number, number]
  >([DEFAULT_START_YEAR, currentYear])

  const [appliedWSTopN, setAppliedWSTopN] = useState<number>(DEFAULT_TOP_N)
  const [appliedWSFontRange, setAppliedWSFontRange] = useState<
    [number, number]
  >([DEFAULT_MIN_FONT, DEFAULT_MAX_FONT])
  const [appliedWSYearRange, setAppliedWSYearRange] = useState<
    [number, number]
  >([DEFAULT_START_YEAR, currentYear])

  // Reset controls when perspective changes
  useEffect(() => {
    setPendingWSTopN(DEFAULT_TOP_N)
    setPendingWSFontRange([DEFAULT_MIN_FONT, DEFAULT_MAX_FONT])
    setPendingWSYearRange([DEFAULT_START_YEAR, currentYear])
    setAppliedWSTopN(DEFAULT_TOP_N)
    setAppliedWSFontRange([DEFAULT_MIN_FONT, DEFAULT_MAX_FONT])
    setAppliedWSYearRange([DEFAULT_START_YEAR, currentYear])
  }, [uid, entityType, currentYear])

  useEffect(() => {
    const contributorUid = currentPerspective?.uid
    const contributorType = currentPerspective?.type
    if (!contributorType || !contributorUid) return
    const fetchData = async () => {
      setLoading(true)
      try {
        const response = await fetch(
          `/api/documents/dataviz?contributorUid=${contributorUid}&contributorType=${contributorType}`,
        )
        if (!response.ok) {
          throw new Error('Failed to fetch documents per year')
        }
        const res = await response.json()
        const documents: Record<
          number,
          {
            uid: string
            oaStatus: OAStatus | null
            publicationDate: string | null
            upwOAStatus: OAStatus | null
            contributions: {
              person: {
                uid: string
                displayName: string | null
              }
              affiliations: {
                uid: string
                displayNames: string[]
                places: {
                  latitude: number
                  longitude: number
                }[]
              }[]
            }[]
          }[]
        > = res.documents
        const years = Object.keys(documents)
          .map(Number)
          .filter((year) => !Number.isNaN(year))
        const oldestYear = years.length == 0 ? null : Math.min(...years)
        const start = oldestYear
          ? oldestYear <= currentYear - 5
            ? currentYear - 5
            : oldestYear
          : currentYear
        setPendingWSYearRange([start, currentYear])
        setDocuments(documents)
      } catch (error) {
        console.error('Error while fetching documents per year', error)
      }
      setLoading(false)
    }
    fetchData()
  }, [currentPerspective, currentYear])

  const wsSliderHaveChanges = !(
    pendingWSTopN === appliedWSTopN &&
    pendingWSFontRange[0] === appliedWSFontRange[0] &&
    pendingWSFontRange[1] === appliedWSFontRange[1] &&
    pendingWSYearRange[0] === appliedWSYearRange[0] &&
    pendingWSYearRange[1] === appliedWSYearRange[1]
  )

  const handleWSSliderValidate = () => {
    setAppliedWSTopN(pendingWSTopN)
    setAppliedWSFontRange(pendingWSFontRange)
    setAppliedWSYearRange(pendingWSYearRange)
  }

  const DashboardHeaderTitle = ({
    i18nMessage,
  }: {
    i18nMessage: MessageDescriptor
  }) => (
    <Typography
      sx={{
        color: theme.palette.primary.main,
        fontSize: theme.utils.pxToRem(20),
        fontStyle: 'normal',
        fontWeight: theme.typography.fontWeightRegular,
        lineHeight: 'normal',
      }}
    >
      {_(i18nMessage)}
    </Typography>
  )

  const canShowWordstream = Boolean(uid && entityType)

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <DocumentHeader
          perspectiveName={displayName}
          pageName={t`dashboard_page_main_title`}
        />
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 2,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
            }}
          >
            <Typography>{t`dashboard_page_publication_by_year_graph_start_year_selection_label`}</Typography>
            <Select
              value={pendingWSYearRange[0]}
              onChange={(event) =>
                setPendingWSYearRange([
                  event.target.value as number,
                  pendingWSYearRange[1],
                ])
              }
            >
              {Array.from(
                {
                  length: currentYear - 1990 + 1,
                },
                (_, i) => 1990 + i,
              ).map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
            }}
          >
            <Typography>{t`dashboard_page_publication_by_year_graph_end_year_selection_label`}</Typography>
            <Select
              value={pendingWSYearRange[1]}
              onChange={(event) =>
                setPendingWSYearRange([
                  pendingWSYearRange[0],
                  event.target.value as number,
                ])
              }
            >
              {Array.from(
                { length: currentYear - pendingWSYearRange[0] + 1 },
                (_, i) => pendingWSYearRange[0] + i,
              ).map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </Box>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, md: 3 }} sx={{ display: 'flex' }}>
          <AgentIdentityCard agent={currentPerspective} />
        </Grid>

        <Grid size={{ xs: 12, md: 9 }}>
          <CustomCard
            header={
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <DashboardHeaderTitle
                  i18nMessage={defineMessage`dashboard_page_publication_by_year_title`}
                />
              </Box>
            }
          >
            <CardContent>
              <PublicationCard
                yearRange={pendingWSYearRange}
                data={documents}
                loading={loading}
              />
            </CardContent>
          </CustomCard>
        </Grid>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <CustomCard
          header={
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <DashboardHeaderTitle
                i18nMessage={defineMessage`dashboard_page_wordstream_title`}
              />
            </Box>
          }
        >
          <CardContent>
            {canShowWordstream ? (
              <Box sx={{ width: '100%' }}>
                <WordStream
                  uid={uid!}
                  entityType={entityType!}
                  lang={lang}
                  topics={[WordstreamTopic.Concepts, WordstreamTopic.CoAuthors]}
                  fromYear={pendingWSYearRange[0]}
                  toYear={pendingWSYearRange[1]}
                  topN={appliedWSTopN}
                  minFont={appliedWSFontRange[0]}
                  maxFont={appliedWSFontRange[1]}
                  autoSize
                />
              </Box>
            ) : (
              <Typography color='text.secondary'>
                No person selected.
              </Typography>
            )}
          </CardContent>

          <Box
            sx={{
              px: 2,
              py: 1.5,
              mt: 1,
              borderTop: `1px solid ${theme.palette.divider}`,
              bgcolor:
                theme.palette.mode === 'light'
                  ? 'rgba(0,0,0,0.02)'
                  : 'rgba(255,255,255,0.03)',
            }}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={3}
              alignItems={{ xs: 'stretch', md: 'center' }}
            >
              <Box sx={{ minWidth: 220, flex: 1 }}>
                <Typography
                  variant='caption'
                  sx={{ display: 'block', mb: 0.5 }}
                >
                  {t`dashboard_page_wordstream_topN_label`}
                </Typography>
                <Slider
                  value={pendingWSTopN}
                  onChange={(_, v) => setPendingWSTopN(v as number)}
                  min={5}
                  max={100}
                  step={1}
                  valueLabelDisplay='auto'
                  aria-label={t`dashboard_page_wordstream_topN_a11y`}
                />
              </Box>

              <Box sx={{ minWidth: 260, flex: 1 }}>
                <Typography
                  variant='caption'
                  sx={{ display: 'block', mb: 0.5 }}
                >
                  {t`dashboard_page_wordstream_font_range_label`}
                </Typography>
                <Slider
                  value={pendingWSFontRange}
                  onChange={(_, v) =>
                    setPendingWSFontRange(v as [number, number])
                  }
                  min={8}
                  max={64}
                  step={1}
                  valueLabelDisplay='auto'
                  aria-label={t`dashboard_page_wordstream_font_range_a11y`}
                />
              </Box>

              <Box sx={{ ml: { md: 'auto' } }}>
                <Button
                  variant='contained'
                  onClick={handleWSSliderValidate}
                  disabled={!wsSliderHaveChanges}
                >
                  {t`dashboard_page_wordstream_validate_button_label`}
                </Button>
              </Box>
            </Stack>
          </Box>
        </CustomCard>
      </Grid>
      <Grid>
        <CustomCard
          header={
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <DashboardHeaderTitle
                i18nMessage={defineMessage`dashboard_page_map_title`}
              />
            </Box>
          }
        >
          <CardContent sx={{ height: 'fit-content' }}>
            <CollaborationMap
              yearRange={pendingWSYearRange}
              data={documents}
              loading={loading}
            />
          </CardContent>
        </CustomCard>
      </Grid>
    </Box>
  )
}
export default DashboardPage
