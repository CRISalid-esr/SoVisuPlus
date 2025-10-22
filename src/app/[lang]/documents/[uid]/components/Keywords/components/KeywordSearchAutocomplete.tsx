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
import { Vocab } from '@/types/Vocab'

export type SuggestedKeyword = {
  link: string
  num: string
  text: string
  vocab: string
}

async function fetchWrapper(value: string): Promise<SuggestedKeyword[]> {
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
                { num: Vocab.iriToIdentifier(item.iri, item.scheme) },
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

type KeywordSearchAutocompleteProps = {
  fetchKeywords?: (value: string) => Promise<SuggestedKeyword[]>
}

function KeywordSearchAutocomplete({
  fetchKeywords = fetchWrapper,
}: KeywordSearchAutocompleteProps) {
  const [keywordInput, setKeywordInput] = useState<string>('')
  const [keywords, setKeywords] = useState<SuggestedKeyword[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [fetchError, setFetchError] = useState<Error | null>(null)

  useEffect(() => {
    const handler = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await fetchKeywords(keywordInput)
        setKeywords(data)
      } catch (error) {
        if (error instanceof Error) {
          setFetchError(error)
        }
      }
      setLoading(false)
    }, 600)

    return () => {
      clearTimeout(handler)
    }
  }, [fetchKeywords, keywordInput])

  useEffect(() => {
    if (fetchError) {
      console.error('Error fetching keyword suggestions:', fetchError)
    }
  }, [fetchError])

  return (
    <Autocomplete
      autoComplete
      clearOnBlur={false}
      clearOnEscape
      filterOptions={(x) => x}
      getOptionLabel={(option) => option.text}
      groupBy={(option) => option.vocab}
      includeInputInList
      inputValue={keywordInput}
      loading={loading}
      noOptionsText={fetchError ? 'Unable to fetch suggestions' : 'No options'}
      onInputChange={(event, value) => {
        setKeywordInput(value)
      }}
      options={
        fetchError
          ? []
          : keywords.sort((a, b) =>
              a.vocab.toLowerCase().localeCompare(b.vocab.toLowerCase()),
            )
      }
      renderInput={(params) => (
        <TextField
          {...params}
          error={!!fetchError}
          helperText={fetchError ? 'Error loading suggestions' : ''}
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
          <Box key={key + option.num} component={'li'} {...optionProps}>
            <Icon />
            <Typography>{ownerState.getOptionLabel(option)}</Typography>
            <Typography sx={{ whiteSpace: 'pre' }}> ({option.num}) </Typography>
            <Tooltip title={option.link}>
              <Link
                href={option.link}
                target='_blank'
                rel='noopener noreferrer'
                sx={{ display: 'inherit' }}
              >
                <InfoOutlined />
              </Link>
            </Tooltip>
          </Box>
        )
      }}
      sx={{ marginTop: '15px' }}
    />
  )
}

export default KeywordSearchAutocomplete
