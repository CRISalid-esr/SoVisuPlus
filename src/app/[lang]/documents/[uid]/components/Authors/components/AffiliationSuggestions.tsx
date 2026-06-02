import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  Link,
  Stack,
  SxProps,
  Typography,
} from '@mui/material'
import { alpha, Theme } from '@mui/material/styles'
import { ChevronRight } from '@mui/icons-material'
import { t } from '@lingui/core/macro'
import { AureHalStructureDoc } from '@/lib/services/AureHalAPIClient'
import { halStructureToAffiliation } from '../lib/halMapping'
import { orderedAffiliationIdentifiers } from '../lib/affiliationDisplay'

interface AffiliationSuggestionsProps {
  importedText: string
  disabled?: boolean
  onAlign: (doc: AureHalStructureDoc) => void
}

const supervisors = (doc: AureHalStructureDoc): { values: string[] } => {
  if (doc.parentAcronym_s && doc.parentAcronym_s.length > 0) {
    return { values: doc.parentAcronym_s }
  }
  if (doc.parentName_s && doc.parentName_s.length > 0) {
    return { values: [doc.parentName_s[0]] }
  }
  return { values: [] }
}

const tealTagSx = {
  backgroundColor: (theme: Theme) => alpha(theme.palette.primary.main, 0.1),
  color: 'primary.main',
  borderColor: (theme: Theme) => alpha(theme.palette.primary.main, 0.3),
} satisfies SxProps<Theme>

const SuggestionBox = ({
  doc,
  disabled,
  onAlign,
}: {
  doc: AureHalStructureDoc
  disabled?: boolean
  onAlign: (doc: AureHalStructureDoc) => void
}) => {
  const name = doc.name_s || doc.label_s || ''
  const ids = orderedAffiliationIdentifiers(halStructureToAffiliation(doc))
  const supervisor = supervisors(doc)

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: (theme) => alpha(theme.palette.primary.main, 0.3),
        borderRadius: 1,
        backgroundColor: 'background.default',
        p: 1,
        display: 'flex',
        justifyContent: 'space-between',
        gap: 1,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Stack direction='row' spacing={0.5} flexWrap='wrap' useFlexGap>
          {doc.acronym_s && (
            <Chip
              size='small'
              variant='outlined'
              label={doc.acronym_s}
              sx={{ ...tealTagSx, fontWeight: 700 }}
            />
          )}
          {ids.map((id) => (
            <Chip
              key={`${id.label}-${id.value}`}
              size='small'
              variant='outlined'
              label={`${id.label} ${id.value}`}
              sx={tealTagSx}
            />
          ))}
        </Stack>
        <Typography sx={{ mt: 0.5, fontWeight: 700 }}>{name}</Typography>
        {supervisor.values.length > 0 && (
          <Typography variant='caption' color='textSecondary' component='div'>
            {supervisor.values.length > 1
              ? t`documents_details_page_authors_tab_supervised_by_other`
              : t`documents_details_page_authors_tab_supervised_by_one`}{' '}
            {supervisor.values.join(', ')}
          </Typography>
        )}
        {doc.code_s && doc.code_s.length > 0 && (
          <Typography variant='caption' color='textSecondary' component='div'>
            {doc.code_s.join(', ')}
          </Typography>
        )}
      </Box>
      <Box>
        <Button
          size='small'
          variant='contained'
          disabled={disabled}
          onClick={() => onAlign(doc)}
        >
          {t`documents_details_page_authors_tab_align`}
        </Button>
      </Box>
    </Box>
  )
}

const AffiliationSuggestions = ({
  importedText,
  disabled,
  onAlign,
}: AffiliationSuggestionsProps) => {
  const [results, setResults] = useState<AureHalStructureDoc[]>([])
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const query = importedText.trim()
    if (query.length < 2) {
      setResults([])
      return
    }
    const controller = new AbortController()
    fetch(`/api/hal/structures?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : { docs: [] }))
      .then((data: { docs?: AureHalStructureDoc[] }) =>
        setResults(data.docs ?? []),
      )
      .catch(() => {
        /* suggestions are best-effort; ignore errors */
      })
    return () => controller.abort()
  }, [importedText])

  if (results.length === 0) return null

  if (!expanded) {
    return (
      <Box sx={{ textAlign: 'left' }}>
        <Button
          size='small'
          variant='text'
          endIcon={<ChevronRight />}
          onClick={() => setExpanded(true)}
          sx={{ fontWeight: 700, justifyContent: 'flex-start', pl: 0 }}
        >
          {t`documents_details_page_authors_tab_suggest`} ({results.length}{' '}
          {t`documents_details_page_authors_tab_suggest_matches`})
        </Button>
      </Box>
    )
  }

  return (
    <Box>
      <Stack
        direction='row'
        alignItems='center'
        justifyContent='space-between'
        sx={{ mb: 1 }}
      >
        <Typography variant='subtitle1' color='text.secondary'>
          {t`documents_details_page_authors_tab_hal_suggestion`}:{' '}
          <Box component='span' sx={{ fontWeight: 700 }}>
            {results.length}
          </Box>
        </Typography>
        <Link
          component='button'
          type='button'
          onClick={() => setExpanded(false)}
          underline='always'
        >
          {t`documents_details_page_authors_tab_hide`}
        </Link>
      </Stack>
      <Stack spacing={1}>
        {results.map((doc) => (
          <SuggestionBox
            key={`${doc.docid}-${doc.valid_s ?? ''}`}
            doc={doc}
            disabled={disabled}
            onAlign={onAlign}
          />
        ))}
      </Stack>
    </Box>
  )
}

export default AffiliationSuggestions
