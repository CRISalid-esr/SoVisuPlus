import { useEffect, useState } from 'react'
import { Box, Button, Chip, Link, Stack, Typography } from '@mui/material'
import { t } from '@lingui/core/macro'
import { AureHalStructureDoc } from '@/lib/services/AureHalAPIClient'
import { halStructureToAffiliation } from '../lib/halMapping'
import { orderedAffiliationIdentifiers } from '../lib/affiliationDisplay'

interface AffiliationSuggestionsProps {
  importedText: string
  disabled?: boolean
  onAlign: (doc: AureHalStructureDoc) => void
}

const supervisedBy = (doc: AureHalStructureDoc): string | null => {
  if (doc.parentAcronym_s && doc.parentAcronym_s.length > 0) {
    return doc.parentAcronym_s.join(', ')
  }
  if (doc.parentName_s && doc.parentName_s.length > 0) {
    return doc.parentName_s[0]
  }
  return null
}

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
  const hasRor = Boolean(doc.ror_s && doc.ror_s.length > 0)
  const ids = orderedAffiliationIdentifiers(halStructureToAffiliation(doc))
  const supervisor = supervisedBy(doc)

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        p: 1,
        display: 'flex',
        justifyContent: 'space-between',
        gap: 1,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Stack direction='row' spacing={0.5} flexWrap='wrap' useFlexGap>
          {doc.acronym_s && (
            <Chip size='small' label={doc.acronym_s} sx={{ fontWeight: 700 }} />
          )}
          {ids.map((id) => (
            <Chip
              key={`${id.label}-${id.value}`}
              size='small'
              variant='outlined'
              label={`${id.label} ${id.value}`}
            />
          ))}
        </Stack>
        <Typography
          sx={{
            mt: 0.5,
            color: hasRor ? 'primary.main' : 'text.primary',
            fontWeight: hasRor ? 700 : 400,
          }}
        >
          {name}
        </Typography>
        {supervisor && (
          <Typography variant='caption' color='textSecondary' component='div'>
            {t`documents_details_page_authors_tab_supervised_by`} {supervisor}
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
          variant='outlined'
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
      <Link
        component='button'
        type='button'
        onClick={() => setExpanded(true)}
        underline='always'
      >
        {t`documents_details_page_authors_tab_suggest`} ({results.length}{' '}
        {t`documents_details_page_authors_tab_suggest_matches`})
      </Link>
    )
  }

  return (
    <Box>
      <Stack direction='row' alignItems='center' spacing={1} sx={{ mb: 1 }}>
        <Typography variant='subtitle2'>
          {t`documents_details_page_authors_tab_hal_suggestion`}:{' '}
          {results.length}
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
