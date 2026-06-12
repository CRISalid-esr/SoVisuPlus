import { useEffect, useState } from 'react'
import { Avatar, Box, Button, Stack, Typography } from '@mui/material'
import { t, plural } from '@lingui/core/macro'
import { AureHalAuthorDoc } from '@/lib/services/AureHalAPIClient'
import { authorInitials } from '../lib/halAuthorProfile'

interface HalProfileSuggestionCardProps {
  doc: AureHalAuthorDoc
  highlighted?: boolean
  disabled?: boolean
  onConfirm: (doc: AureHalAuthorDoc) => void
}

type Enrichment = {
  affiliations: string | null
  publicationCount: number | null
}

const publicationLabel = (count: number): string =>
  count === 0
    ? t`documents_details_page_authors_tab_no_publication`
    : plural(count, {
        one: '# publication in HAL',
        other: '# publications in HAL',
      })

/**
 * A single HAL profile suggested for a "Not identified" contributor. Lazily fetches
 * the profile's affiliations and HAL publication count (one backend call) on mount,
 * i.e. only once the suggestion panel is expanded and the card is rendered.
 */
const HalProfileSuggestionCard = ({
  doc,
  highlighted,
  disabled,
  onConfirm,
}: HalProfileSuggestionCardProps) => {
  const [enrichment, setEnrichment] = useState<Enrichment | null>(null)

  useEffect(() => {
    // Skip the round-trip entirely when the profile carries neither the
    // affiliation prerequisites (firstName + lastName + email) nor the
    // publication ones (form_i + person_i) — the backend would only return nulls.
    const canQueryAffiliations = Boolean(
      doc.firstName_s && doc.lastName_s && doc.emailDomain_s?.length,
    )
    const canQueryPublications = doc.form_i != null && doc.person_i != null
    if (!canQueryAffiliations && !canQueryPublications) return

    const params = new URLSearchParams()
    if (canQueryAffiliations) {
      params.set('firstName', doc.firstName_s!)
      params.set('lastName', doc.lastName_s!)
      params.set('email', doc.emailDomain_s!.join(','))
    }
    if (canQueryPublications) {
      params.set('formId', String(doc.form_i))
      params.set('personId', String(doc.person_i))
    }

    const controller = new AbortController()
    fetch(`/api/hal/author-profile?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Enrichment | null) => data && setEnrichment(data))
      .catch(() => {
        /* enrichment is best-effort; ignore errors */
      })
    return () => controller.abort()
  }, [doc])

  const name = doc.fullName_s || doc.label_s || ''
  const secondLine = [
    enrichment?.affiliations || null,
    enrichment?.publicationCount != null
      ? publicationLabel(enrichment.publicationCount)
      : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Box
      sx={{
        border: '1.5px solid',
        borderColor: highlighted ? 'primary.main' : 'grey.300',
        borderRadius: 1,
        backgroundColor: 'background.default',
        p: 1.25,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      <Avatar sx={{ width: 32, height: 32, fontSize: '0.8125rem' }}>
        {authorInitials(doc)}
      </Avatar>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack
          direction='row'
          spacing={0.75}
          alignItems='center'
          flexWrap='wrap'
        >
          <Typography sx={{ fontWeight: 700 }}>{name}</Typography>
          {doc.idHal_s && (
            <Typography variant='body2' color='primary.main'>
              {doc.idHal_s}
            </Typography>
          )}
          {doc.orcidId_s?.length ? (
            <Box
              component='img'
              src='/icons/orcid.png'
              alt='ORCID'
              sx={{ width: 14, height: 14, objectFit: 'contain' }}
            />
          ) : null}
          {doc.idrefId_s?.length ? (
            <Box
              component='img'
              src='/icons/idref.png'
              alt='IdRef'
              sx={{ width: 14, height: 14, objectFit: 'contain' }}
            />
          ) : null}
        </Stack>
        {secondLine && (
          <Typography variant='caption' color='textSecondary' component='div'>
            {secondLine}
          </Typography>
        )}
      </Box>

      <Button
        size='small'
        variant='contained'
        disabled={disabled}
        onClick={() => onConfirm(doc)}
        sx={{ flexShrink: 0 }}
      >
        {t`documents_details_page_authors_tab_confirm_profile`}
      </Button>
    </Box>
  )
}

export default HalProfileSuggestionCard
