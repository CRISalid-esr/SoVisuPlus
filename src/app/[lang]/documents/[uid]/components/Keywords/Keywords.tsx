import { CustomCard } from '@/components/Card'
import { Trans } from '@lingui/react'
import {
  Autocomplete,
  Box,
  Button,
  CardContent,
  Icon,
  InputAdornment,
  Link,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import useStore from '@/stores/global_store'
import { useEffect, useMemo, useState } from 'react'
import { ConceptGroup } from '@/types/ConceptGroup'
import ConceptChip from '@/app/[lang]/documents/[uid]/components/Keywords/ConceptChip'
import * as Lingui from '@lingui/core'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { Concept } from '@/types/Concept'
import { Add, InfoOutlined } from '@mui/icons-material'
import {
  SuggestResponse,
  SuggestResponseSchema,
} from '@/lib/services/VocabSearchClient'

type SuggestedKeyword = {
  link: string
  num: string
  text: string
  vocab: string
}

function numVocab(vocab: string) {
  switch (vocab.toLowerCase()) {
    case 'aat':
      return getAATNum
    case 'jel':
      return getJelNum
    case 'acm':
      return getAcmNum
    default:
      return (iri: string) => {
        return iri
      }
  }
}

function getAATNum(iri: string): string {
  const str = iri.split('/')
  return str[str.length - 1]
}

function getJelNum(iri: string): string {
  const str = iri.split('#')
  return str[str.length - 1]
}

function getAcmNum(iri: string): string {
  const str = iri.split('/')
  return str[str.length - 1].replaceAll('.', ' - ')
}

function Keywords() {
  const theme = useTheme()
  const [keywordInput, setKeywordInput] = useState<string>('')
  const [keywords, setKeywords] = useState<SuggestedKeyword[]>([])

  const { selectedDocument = null, error = null } = useStore(
    (state) => state.document,
  )
  const removeConcepts = useStore((state) => state.document.removeConcepts)

  const lang = Lingui.i18n.locale

  const groups = useMemo(
    () => ConceptGroup.fromConcepts(selectedDocument?.subjects ?? []),
    [selectedDocument?.subjects],
  )

  const { ownPerspective } = useStore((state) => state.user)

  const onRemoveConcepts = async (concepts: Concept[]) => {
    if (!selectedDocument) return
    await removeConcepts(concepts.map((c) => c.uid as string))
  }

  const fetchKeywords = async (value: string) => {
    if (value) {
      const response = await fetch('/api/vocabs' + '?q=' + value)
      if (response.ok) {
        const json: SuggestResponse = SuggestResponseSchema.parse(
          await response.json(),
        )
        setKeywords(
          json.items
            .map((item) =>
              item.best_label
                ? Object.assign(
                    { link: item.iri },
                    { num: numVocab(item.scheme)(item.iri) },
                    { text: item.best_label?.text, vocab: item.scheme },
                  )
                : undefined,
            )
            .filter((item) => item != undefined),
        )
      }
    }
  }

  useEffect(() => {
    const delay = setTimeout(() => {
      if (keywordInput) {
        fetchKeywords(keywordInput)
      }
    }, 300)
    return () => clearTimeout(delay)
  }, [keywordInput])

  useEffect(() => {
    // Implement a centralized error handling
    if (error) {
      console.error('Error in Keywords component:', error)
    }
  }, [error])

  return (
    <CustomCard
      header={
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography
            sx={{
              color: theme.palette.primary.main,
              fontSize: theme.utils.pxToRem(20),
              fontStyle: 'normal',
              fontWeight: theme.typography.fontWeightRegular,
              lineHeight: 'normal',
            }}
          >
            <Trans id='document_details_page_keywords_tab_card_title' />
          </Typography>
          <Button variant='contained' color='primary'>
            <Trans id='document_details_page_keywords_tab_card_validate_button' />
          </Button>
        </Box>
      }
    >
      <CardContent>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {groups.map((group) => (
            <ConceptChip
              key={group.uid as string}
              group={group}
              language={lang as ExtendedLanguageCode}
              removable={ownPerspective}
              onRemoveConcepts={onRemoveConcepts}
            />
          ))}
        </Box>
        <Box>
          <Autocomplete
            filterOptions={(x) => x}
            getOptionLabel={(option) => option.text}
            groupBy={(option) => option.vocab}
            onInputChange={(event, value) => {
              setKeywordInput(value)
            }}
            options={keywords.sort((a, b) =>
              a.vocab.toLowerCase().localeCompare(b.vocab.toLowerCase()),
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                slotProps={{
                  input: {
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position='start'>
                        <Add />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            )}
            renderOption={(props, option, state, ownerState) => {
              const { key, ...optionProps } = props
              return (
                <Box key={key} component={'li'} {...optionProps}>
                  <Icon />
                  <Typography>{ownerState.getOptionLabel(option)}</Typography>
                  <Typography>({option.num})</Typography>
                  <Tooltip title={option.link}>
                    <Link
                      href={option.link}
                      target='_blank'
                      rel='noopener noreferrer'
                    >
                      <InfoOutlined />
                    </Link>
                  </Tooltip>
                </Box>
              )
            }}
          />
        </Box>
      </CardContent>
    </CustomCard>
  )
}

export default Keywords
