import { useEffect, useState } from 'react'
import { Box, Button, Link, Stack, Typography } from '@mui/material'
import { ChevronRight } from '@mui/icons-material'
import { t } from '@lingui/core/macro'
import { AureHalAuthorDoc } from '@/lib/services/AureHalAPIClient'
import HalProfileSuggestionCard from './HalProfileSuggestionCard'

interface HalProfileSuggestionsProps {
  displayName: string
  disabled?: boolean
  onConfirm: (doc: AureHalAuthorDoc) => void
}

/**
 * Suggests HAL author profiles for a "Not identified" contributor, based on its
 * display name. Mirrors the affiliation suggestions: a collapsed "Suggest (N)"
 * text button, expanding into a titled list of profile cards. Wrapped in an orange
 * "needs attention" box. Renders nothing when no profile matches.
 */
const HalProfileSuggestions = ({
  displayName,
  disabled,
  onConfirm,
}: HalProfileSuggestionsProps) => {
  const [results, setResults] = useState<AureHalAuthorDoc[]>([])
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const query = displayName.trim()
    if (!query) {
      setResults([])
      return
    }
    const controller = new AbortController()
    fetch(`/api/hal/author-suggestions?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : { docs: [] }))
      .then((data: { docs?: AureHalAuthorDoc[] }) =>
        setResults(data.docs ?? []),
      )
      .catch(() => {
        /* suggestions are best-effort; ignore errors */
      })
    return () => controller.abort()
  }, [displayName])

  if (results.length === 0) return null

  return (
    <Box
      sx={{
        p: 1,
        borderRadius: 1,
        backgroundColor: (theme) => theme.palette.warningSurface,
        border: '1px solid',
        borderColor: (theme) => theme.palette.warningOutline,
      }}
    >
      {!expanded ? (
        <Box sx={{ textAlign: 'left' }}>
          <Button
            size='small'
            variant='text'
            endIcon={<ChevronRight />}
            disabled={disabled}
            onClick={() => setExpanded(true)}
            sx={{ fontWeight: 700, justifyContent: 'flex-start', pl: 0 }}
          >
            {t`documents_details_page_authors_tab_suggest`} ({results.length}{' '}
            {t`documents_details_page_authors_tab_suggest_matches`})
          </Button>
        </Box>
      ) : (
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
          <Stack spacing={0.75}>
            {results.map((doc, index) => (
              <HalProfileSuggestionCard
                key={`suggestion-${index}`}
                doc={doc}
                highlighted={index === 0}
                disabled={disabled}
                onConfirm={onConfirm}
              />
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  )
}

export default HalProfileSuggestions
