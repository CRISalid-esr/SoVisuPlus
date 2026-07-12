'use client'

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  CircularProgress,
  List,
  ListItem,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { useEffect, useRef, useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { OrcidPersonData } from '@/lib/services/OrcidPublicClient'

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; data: OrcidPersonData }
  | { status: 'not_found' }
  | { status: 'error' }

type OrcidInfoBoxProps = {
  orcid: string
  forceOpen?: boolean
  onReady?: () => void // called when data loaded or not found (ready for user decision)
}

/**
 * ORCID public-profile preview for the manual ORCID confirmation flow — the
 * ORCID counterpart of IdRefInfoBox / HalInfoBox. Fetches /api/orcid/person and
 * shows the matched person's identity so the editor can confirm before adding.
 */
const OrcidInfoBox = ({
  orcid,
  forceOpen = false,
  onReady,
}: OrcidInfoBoxProps) => {
  const [expanded, setExpanded] = useState(forceOpen)
  const [state, setState] = useState<LoadState>({ status: 'idle' })
  const loadedRef = useRef<string | null>(null)

  const load = async (id: string) => {
    if (loadedRef.current === id) return
    loadedRef.current = id
    setState({ status: 'loading' })
    try {
      const res = await fetch(`/api/orcid/person/${encodeURIComponent(id)}`)
      if (res.status === 404) {
        setState({ status: 'not_found' })
        onReady?.()
        return
      }
      if (!res.ok) {
        setState({ status: 'error' })
        return
      }
      const data: OrcidPersonData = await res.json()
      setState({ status: 'loaded', data })
      onReady?.()
    } catch {
      setState({ status: 'error' })
    }
  }

  useEffect(() => {
    if (forceOpen) {
      setExpanded(true)
      load(orcid)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceOpen, orcid])

  const handleChange = (_: React.SyntheticEvent, isExpanded: boolean) => {
    if (forceOpen) return
    setExpanded(isExpanded)
    if (isExpanded) load(orcid)
  }

  const displayName = (d: OrcidPersonData) => {
    const full = `${d.givenNames ?? ''} ${d.familyName ?? ''}`.trim()
    return full || d.creditName || ''
  }

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
            <Trans>orcid_info_box_title</Trans>
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
            <Trans>orcid_info_box_not_found</Trans>
          </Typography>
        )}

        {state.status === 'error' && (
          <Typography variant='body2' color='error'>
            <Trans>orcid_info_box_error</Trans>
          </Typography>
        )}

        {state.status === 'loaded' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant='body1' fontWeight='medium'>
              {displayName(state.data)}
            </Typography>

            {state.data.otherNames.length > 0 && (
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                  fontWeight='bold'
                  textTransform='uppercase'
                >
                  <Trans>orcid_info_box_other_names</Trans>
                </Typography>
                <Box
                  sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}
                >
                  {state.data.otherNames.map((n, i) => (
                    <Chip key={i} label={n} size='small' variant='outlined' />
                  ))}
                </Box>
              </Box>
            )}

            {state.data.affiliations.length > 0 && (
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                  fontWeight='bold'
                  textTransform='uppercase'
                >
                  <Trans>orcid_info_box_affiliations</Trans>
                </Typography>
                <List dense disablePadding sx={{ mt: 0.5 }}>
                  {state.data.affiliations.map((aff, i) => (
                    <ListItem key={i} disablePadding sx={{ pb: 0.5 }}>
                      <Typography variant='body2' color='text.secondary'>
                        {aff}
                      </Typography>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  )
}

export default OrcidInfoBox
