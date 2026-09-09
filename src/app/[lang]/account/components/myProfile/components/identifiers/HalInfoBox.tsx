'use client'

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  CircularProgress,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { useEffect, useRef, useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { AureHalAuthorDoc, IdHalKind } from '@/lib/services/AureHalAPIClient'

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; data: AureHalAuthorDoc }
  | { status: 'not_found' }
  | { status: 'error' }

type HalInfoBoxProps = {
  value: string
  kind: IdHalKind
  forceOpen?: boolean
  onReady?: () => void // called when data loaded or not found (ready for user decision)
}

/**
 * AureHAL author preview for the manual idHAL confirmation flow — the HAL
 * counterpart of IdRefInfoBox. Fetches /api/aurehal/author and shows the matched
 * author's identity so the editor can confirm before adding the identifier.
 */
const HalInfoBox = ({
  value,
  kind,
  forceOpen = false,
  onReady,
}: HalInfoBoxProps) => {
  const [expanded, setExpanded] = useState(forceOpen)
  const [state, setState] = useState<LoadState>({ status: 'idle' })
  const loadedKey = useRef<string | null>(null)

  const load = async (v: string, k: IdHalKind) => {
    const key = `${k}:${v}`
    if (loadedKey.current === key) return
    loadedKey.current = key
    setState({ status: 'loading' })
    try {
      const res = await fetch(
        `/api/aurehal/author?value=${encodeURIComponent(v)}&kind=${k}`,
      )
      if (res.status === 404) {
        setState({ status: 'not_found' })
        onReady?.()
        return
      }
      if (!res.ok) {
        setState({ status: 'error' })
        return
      }
      const data: AureHalAuthorDoc = await res.json()
      setState({ status: 'loaded', data })
      onReady?.()
    } catch {
      setState({ status: 'error' })
    }
  }

  useEffect(() => {
    if (forceOpen) {
      setExpanded(true)
      load(value, kind)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceOpen, value, kind])

  const handleChange = (_: React.SyntheticEvent, isExpanded: boolean) => {
    if (forceOpen) return
    setExpanded(isExpanded)
    if (isExpanded) load(value, kind)
  }

  const displayName = (doc: AureHalAuthorDoc) =>
    doc.firstName_s || doc.lastName_s
      ? `${doc.firstName_s ?? ''} ${doc.lastName_s ?? ''}`.trim()
      : doc.fullName_s

  return (
    <Accordion
      expanded={expanded}
      onChange={handleChange}
      disableGutters
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        '&:before': { display: 'none' },
        '&.Mui-expanded': { borderColor: 'primary.light' },
      }}
    >
      <AccordionSummary
        expandIcon={forceOpen ? null : <ExpandMoreIcon />}
        sx={{ minHeight: 48, px: 2 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoOutlinedIcon fontSize='small' color='primary' />
          <Typography variant='subtitle2' fontWeight='bold'>
            <Trans>hal_info_box_title</Trans>
          </Typography>
          {state.status === 'loading' && (
            <CircularProgress size={14} thickness={5} />
          )}
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ px: 2, pb: 2, pt: 0 }}>
        {state.status === 'loading' && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={32} />
          </Box>
        )}

        {state.status === 'not_found' && (
          <Typography variant='body2' color='text.secondary' fontStyle='italic'>
            <Trans>hal_info_box_not_found</Trans>
          </Typography>
        )}

        {state.status === 'error' && (
          <Typography variant='body2' color='error'>
            <Trans>hal_info_box_error</Trans>
          </Typography>
        )}

        {state.status === 'loaded' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant='body1' fontWeight='medium'>
                {displayName(state.data)}
              </Typography>
              {state.data.valid_s && (
                <Chip
                  label={state.data.valid_s}
                  size='small'
                  variant='outlined'
                />
              )}
            </Box>

            {(state.data.orcidId_s?.length || state.data.idrefId_s?.length) && (
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                  fontWeight='bold'
                  textTransform='uppercase'
                >
                  <Trans>hal_info_box_linked_identifiers</Trans>
                </Typography>
                <Box
                  sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}
                >
                  {state.data.orcidId_s?.map((id, i) => (
                    <Chip
                      key={`orcid-${i}`}
                      label={`ORCID: ${id.replace(/^https?:\/\/orcid\.org\//i, '')}`}
                      size='small'
                      variant='outlined'
                    />
                  ))}
                  {state.data.idrefId_s?.map((id, i) => (
                    <Chip
                      key={`idref-${i}`}
                      label={`IdRef: ${id}`}
                      size='small'
                      variant='outlined'
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  )
}

export default HalInfoBox
