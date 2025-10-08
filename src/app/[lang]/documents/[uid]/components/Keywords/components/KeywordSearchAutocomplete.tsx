import {
  Autocomplete,
  Box,
  Icon,
  InputAdornment,
  Link,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { Add, InfoOutlined } from '@mui/icons-material'
import {
  SuggestResponse,
  SuggestResponseSchema,
} from '@/lib/services/VocabSearchClient'
import { useQuery, useQueryClient } from '@tanstack/react-query'

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

function KeywordSearchAutocomplete() {
  const [keywordInput, setKeywordInput] = useState<string>('')
  const queryClient = useQueryClient()

  const fetchKeywords = async (value: string): Promise<SuggestedKeyword[]> => {
    if (value) {
      const response = await fetch('/api/vocabs' + '?q=' + value)
      if (response.ok) {
        const json: SuggestResponse = SuggestResponseSchema.parse(
          await response.json(),
        )
        return json.items
          .map((item) =>
            item.best_label
              ? Object.assign(
                  { link: item.iri },
                  { num: numVocab(item.scheme)(item.iri) },
                  { text: item.best_label?.text, vocab: item.scheme },
                )
              : undefined,
          )
          .filter((item) => item != undefined)
      } else {
        throw new Error(
          'Fail while fetching keywords suggestion : ' + response.statusText,
        )
      }
    } else {
      return []
    }
  }

  const {
    isPending,
    isError,
    error: fetchKeywordsError,
    data: keywords = [],
  } = useQuery({
    queryKey: ['keywords'],
    queryFn: async () => await fetchKeywords(keywordInput),
    retry: false,
  })

  useEffect(() => {
    const delay = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['keywords'] })
    }, 300)
    return () => clearTimeout(delay)
  }, [queryClient, keywordInput])

  useEffect(() => {
    if (isError) {
      console.error('Error fetching keyword suggestions:', fetchKeywordsError)
    }
  }, [isError, fetchKeywordsError])

  return (
    <Autocomplete
      filterOptions={(x) => x}
      getOptionLabel={(option) => option.text}
      groupBy={(option) => option.vocab}
      loading={isPending}
      noOptionsText={isError ? 'Unable to fetch suggestions' : 'No options'}
      onInputChange={(event, value) => {
        setKeywordInput(value)
      }}
      options={
        isError
          ? []
          : keywords.sort((a, b) =>
              a.vocab.toLowerCase().localeCompare(b.vocab.toLowerCase()),
            )
      }
      renderInput={(params) => (
        <TextField
          {...params}
          error={isError}
          helperText={isError ? 'Error loading suggestions' : ''}
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
  )
}

export default KeywordSearchAutocomplete
