'use client'

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
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
import { IdRefPersonData } from '@/lib/services/IdRefService'

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; data: IdRefPersonPreview }
  | { status: 'not_found' }
  | { status: 'error' }

/** Preview response: the record, plus whether another person holds it. */
type IdRefPersonPreview = IdRefPersonData & { usedByAnotherPerson?: boolean }

type IdRefInfoBoxProps = {
  idrefId: string
  /** Person the IdRef is added to; enables the "used by another person" check. */
  personUid?: string
  forceOpen?: boolean
  onReady?: () => void // called when data loaded or not found (ready for user decision)
}

const IdRefInfoBox = ({
  idrefId,
  personUid,
  forceOpen = false,
  onReady,
}: IdRefInfoBoxProps) => {
  const [expanded, setExpanded] = useState(forceOpen)
  const [state, setState] = useState<LoadState>({ status: 'idle' })
  const loadedIdRef = useRef<string | null>(null)

  const load = async (id: string) => {
    if (loadedIdRef.current === id) return
    loadedIdRef.current = id
    setState({ status: 'loading' })
    try {
      const query = personUid ? `?${new URLSearchParams({ personUid })}` : ''
      const res = await fetch(`/api/idref/${encodeURIComponent(id)}${query}`)
      if (res.status === 404) {
        setState({ status: 'not_found' })
        onReady?.()
        return
      }
      if (!res.ok) {
        setState({ status: 'error' })
        return
      }
      const data: IdRefPersonPreview = await res.json()
      setState({ status: 'loaded', data })
      // An IdRef held by another person cannot be added: keep Save disabled
      if (!data.usedByAnotherPerson) onReady?.()
    } catch {
      setState({ status: 'error' })
    }
  }

  // When forced open, load immediately
  useEffect(() => {
    if (forceOpen) {
      setExpanded(true)
      load(idrefId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceOpen, idrefId])

  const handleChange = (_: React.SyntheticEvent, isExpanded: boolean) => {
    if (forceOpen) return
    setExpanded(isExpanded)
    if (isExpanded) load(idrefId)
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
            <Trans>idref_info_box_title</Trans>
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
            <Trans>idref_info_box_not_found</Trans>
          </Typography>
        )}

        {state.status === 'error' && (
          <Typography variant='body2' color='error'>
            <Trans>idref_info_box_error</Trans>
          </Typography>
        )}

        {state.status === 'loaded' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {state.data.usedByAnotherPerson && (
              <Alert severity='warning'>
                <Trans>idref_info_box_used_by_another_person</Trans>
              </Alert>
            )}
            <Box>
              <Typography variant='body1' fontWeight='medium'>
                {state.data.firstName} {state.data.lastName}
              </Typography>
              {state.data.description && (
                <Typography variant='body2' color='text.secondary'>
                  {state.data.description}
                </Typography>
              )}
            </Box>

            {state.data.otherIdentifiers.length > 0 && (
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                  fontWeight='bold'
                  textTransform='uppercase'
                >
                  <Trans>idref_info_box_other_identifiers</Trans>
                </Typography>
                <Box
                  sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}
                >
                  {state.data.otherIdentifiers.map((id, i) => (
                    <Chip
                      key={i}
                      label={`${id.system}: ${id.value}`}
                      size='small'
                      variant='outlined'
                    />
                  ))}
                </Box>
              </Box>
            )}

            {state.data.recentPublications.length > 0 && (
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                  fontWeight='bold'
                  textTransform='uppercase'
                >
                  <Trans>idref_info_box_publications</Trans>
                </Typography>
                <List dense disablePadding sx={{ mt: 0.5 }}>
                  {state.data.recentPublications.map((pub, i) => (
                    <ListItem key={i} disablePadding sx={{ pb: 0.5 }}>
                      <Typography variant='body2' color='text.secondary'>
                        {pub}
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

export default IdRefInfoBox
