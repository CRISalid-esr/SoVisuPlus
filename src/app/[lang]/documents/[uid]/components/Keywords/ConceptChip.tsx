import React, { useRef, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardActions,
  Chip,
  CircularProgress,
  ClickAwayListener,
  Divider,
  Grow,
  Link,
  Popper,
  Typography,
} from '@mui/material'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { ConceptGroup } from '@/types/ConceptGroup'
import { Trans } from '@lingui/react'
import DeleteIcon from '@mui/icons-material/Delete'
import Wikidata from '@/public/icons/wikidata-vocab.png'
import Jel from '@/public/icons/jel-vocab.png'
import Abes from '@/public/icons/abes-vocab.png'
import { StaticImageData } from 'next/image'
import { Concept, ConceptVocabulary } from '@/types/Concept'
import Idref from '@/public/icons/idref-vocab.png'
import UnknownVocab from '@/public/icons/unknown-vocab.png'
import { CancelSharp } from '@mui/icons-material'

const vocabularyIcons: Record<ConceptVocabulary, StaticImageData | null> = {
  WIKIDATA: Wikidata,
  IDREF: Idref,
  JEL: Jel,
  ABES: Abes,
  UNKNOWN: null,
}

type Props = {
  group: ConceptGroup
  language: ExtendedLanguageCode
  removable?: boolean
  onRemoveConcepts: (concepts: Concept[]) => Promise<void>
}

const unknownVocabularyIcon = (
  <img
    src={UnknownVocab.src}
    alt='Unknown'
    width={24}
    height={24}
    style={{ verticalAlign: 'text-bottom' }}
  />
)
const getVocabularyIcon = (vocab: ConceptVocabulary) => {
  const icon = vocabularyIcons[vocab]
  if (icon) {
    return (
      // add margin right 1
      <img
        src={icon.src}
        alt={vocab}
        width={24}
        height={24}
        style={{ marginRight: 8 }}
      />
    )
  }
  return unknownVocabularyIcon
}

export default function ConceptChip({
  group,
  removable,
  language,
  onRemoveConcepts,
}: Props) {
  const chipRef = useRef<HTMLDivElement>(null)
  const [openPopper, setOpenPopper] = useState(false)

  const labels = group.getDisplayLabels(language)

  const hasOnlyWithUri = group.concepts.every((c) => !!c.uri)
  const hasAllWithoutUri = group.concepts.every((c) => !c.uri)

  const handleToggle = () => {
    setOpenPopper(!openPopper)
  }

  const handleClose = () => {
    setOpenPopper(false)
  }

  const [deletingGroup, setDeletingGroup] = useState(false)
  type DeletingItemMap = Record<string, boolean>
  const [deletingItem, setDeletingItem] = useState<DeletingItemMap>({})

  const handleDelete = async (event: React.MouseEvent<HTMLElement>) => {
    if (!removable) return
    if (deletingGroup) return
    event.stopPropagation()
    setDeletingGroup(true)
    setOpenPopper(false)
    try {
      await onRemoveConcepts(group.concepts)
    } finally {
      setDeletingGroup(false)
      handleClose()
    }
  }

  const handleDeleteConcept = async (concept: Concept) => {
    if (!removable) return
    if (deletingItem[concept.uid ?? '']) return

    setDeletingItem((prev) => ({ ...prev, [concept.uid ?? '']: true }))
    try {
      await onRemoveConcepts([concept])
    } finally {
      setDeletingItem((prev) => ({ ...prev, [concept.uid ?? '']: false }))
    }
  }

  return (
    <ClickAwayListener onClickAway={handleClose}>
      <Box display='inline-block'>
        <Box onClick={handleToggle} role='button' ref={chipRef}>
          <Chip
            component='div'
            role='none'
            label={labels[0] ?? '—'}
            variant='outlined'
            onDelete={removable ? handleDelete : undefined}
            deleteIcon={
              deletingGroup ? (
                <CircularProgress size={16} color='inherit' />
              ) : (
                <CancelSharp />
              )
            }
            sx={{
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.08)',
              },
              textDecorationLine: hasOnlyWithUri ? 'none' : 'underline',
              textDecorationStyle: 'wavy',
              textDecorationColor: hasAllWithoutUri ? 'red' : 'orange',
              textDecorationThickness: '1px',
            }}
          />
        </Box>

        <Popper
          open={openPopper}
          anchorEl={chipRef.current}
          placement='bottom-start'
          transition
          disablePortal
          modifiers={[{ name: 'offset', options: { offset: [0, 8] } }]}
          sx={{
            opacity: 1,
            zIndex: 1,
          }}
        >
          {({ TransitionProps }) => (
            <Grow {...TransitionProps} timeout={200}>
              <Card sx={{ maxWidth: 350 }}>
                <CardActionArea sx={{ px: 2, pt: 2 }}>
                  {group.concepts.map((concept, index) => {
                    const vocab = concept.getVocabulary()
                    const isKnownVocab = vocab && vocab !== 'UNKNOWN'
                    const vocabIconComponent = vocab
                      ? getVocabularyIcon(vocab)
                      : unknownVocabularyIcon

                    return (
                      <Box key={index}>
                        <Box sx={{ mb: removable ? 0 : 2 }}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              mb: 1,
                            }}
                          >
                            {concept.uid &&
                            isKnownVocab &&
                            vocabIconComponent ? (
                              <>
                                <Link
                                  href={concept.uid}
                                  target='_blank'
                                  rel='noopener noreferrer'
                                  role={'link'}
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    mr: 1,
                                    textDecoration: 'none',
                                  }}
                                >
                                  {vocabIconComponent}
                                  <Chip
                                    label={`${concept.getVocabulary()} ${concept.getIdentifier()}`}
                                    size='small'
                                    color='secondary'
                                    clickable
                                    onClick={() => {
                                      if (concept.uri)
                                        window.open(
                                          concept.uri,
                                          '_blank',
                                          'noopener,noreferrer',
                                        )
                                    }}
                                    sx={{
                                      ml: 1,
                                      cursor: 'pointer',
                                      textDecoration: 'none',
                                      '&:hover': {
                                        backgroundColor: 'primary.light',
                                        textDecoration: 'underline',
                                      },
                                    }}
                                  />
                                </Link>
                              </>
                            ) : (
                              <Typography
                                variant='body2'
                                sx={{
                                  fontWeight: 'bold',
                                }}
                              >
                                {vocabIconComponent}

                                <Trans id='concept_chips_free_keyword' />
                              </Typography>
                            )}
                          </Box>
                          <Box
                            sx={{
                              ml: 4,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 0.5,
                            }}
                          >
                            {isKnownVocab && (
                              <Typography
                                variant='body2'
                                sx={{ fontWeight: 'bold', mr: 1 }}
                              >
                                <Trans id='concept_chips_pref_label' />
                              </Typography>
                            )}
                            {isKnownVocab &&
                              concept.prefLabels.map((label, i) => (
                                <Box
                                  key={i}
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                  }}
                                >
                                  {label.language !== 'ul' && (
                                    <Chip label={label.language} size='small' />
                                  )}
                                  <Typography variant='body2'>
                                    {label.value}
                                  </Typography>
                                </Box>
                              ))}
                          </Box>

                          {isKnownVocab && concept.altLabels.length > 0 && (
                            <Box sx={{ ml: 4, mt: 1 }}>
                              <Typography
                                variant='body2'
                                sx={{ fontWeight: 'bold' }}
                              >
                                <Trans id='concept_chips_alt_label' />
                              </Typography>
                              <Box
                                sx={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 0.5,
                                  mt: 0.5,
                                }}
                              >
                                {concept.altLabels.map((label, i) => (
                                  <Box
                                    key={i}
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 1,
                                    }}
                                  >
                                    {label.language !== 'ul' && (
                                      <Chip
                                        label={label.language}
                                        size='small'
                                      />
                                    )}
                                    <Typography variant='body2'>
                                      {label.value}
                                    </Typography>
                                  </Box>
                                ))}
                              </Box>
                            </Box>
                          )}

                          {!isKnownVocab && concept.prefLabels.length === 1 && (
                            <Box
                              sx={{
                                ml: 4,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                              }}
                            >
                              {concept.prefLabels[0].language !== 'ul' && (
                                <Chip
                                  label={concept.prefLabels[0].language}
                                  size='small'
                                />
                              )}
                              <Typography variant='body2'>
                                {concept.prefLabels[0].value}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                        {removable && (
                          <CardActions>
                            <Button
                              size='small'
                              onClick={() => {
                                handleDeleteConcept(concept)
                              }}
                              sx={{ marginLeft: 'auto' }}
                              color='error'
                              startIcon={
                                deletingItem[concept.uid ?? ''] ? (
                                  <CircularProgress size={16} color='inherit' />
                                ) : (
                                  <DeleteIcon />
                                )
                              }
                            >
                              <Trans id='concept_chip_action_delete' />
                            </Button>
                          </CardActions>
                        )}
                        {index < group.concepts.length - 1 && (
                          <Divider sx={{ my: 1 }} />
                        )}
                      </Box>
                    )
                  })}
                </CardActionArea>
              </Card>
            </Grow>
          )}
        </Popper>
      </Box>
    </ClickAwayListener>
  )
}
