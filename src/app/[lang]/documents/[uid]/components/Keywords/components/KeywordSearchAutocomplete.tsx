import {
  Autocomplete,
  Box,
  Divider,
  Icon,
  IconButton,
  InputAdornment,
  Link,
  Pagination,
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
import Image from 'next/image'
import { VOCABS } from '@/lib/services/Vocabs'
import { Trans } from '@lingui/react'

export type SuggestedKeyword = {
  link: string
  num: string
  text: string
  vocab: string
}

export type SuggestedKeywordsData = {
  items: SuggestedKeyword[]
  total: number
  vocab: string
}

async function getData(
  value: string,
  vocab: string,
  offset: number,
): Promise<SuggestedKeywordsData> {
  const response = await fetch(
    '/api/vocabs' +
      '?q=' +
      value +
      '&limit=5' +
      '&offset=' +
      offset +
      '&vocabs=' +
      vocab,
  )
  if (response.ok) {
    const json: SuggestResponse = SuggestResponseSchema.parse(
      await response.json(),
    )
    return {
      total: json.total,
      vocab: vocab.toUpperCase(),
      items: json.items
        .map((item) =>
          item.best_label
            ? Object.assign(
                { link: item.iri },
                { num: Vocab.iriToIdentifier(item.iri, item.scheme) },
                { text: item.best_label?.text, vocab: item.scheme },
              )
            : undefined,
        )
        .filter((item) => item != undefined),
    }
  } else {
    throw new Error(
      'Fail while fetching keywords suggestion : ' + response.statusText,
    )
  }
}

async function fetchWrapper(
  value: string,
  vocabs = Vocab.getVocabs(),
): Promise<SuggestedKeywordsData[]> {
  if (value) {
    const results = await Promise.all(
      vocabs.map((vocab) => getData(value, vocab, 0)),
    )
    return results.flat()
  } else {
    return []
  }
}

export type KeywordSearchAutocompleteProps = {
  fetchKeywords?: (value: string) => Promise<SuggestedKeywordsData[]>
}

function KeywordSearchAutocomplete({
  fetchKeywords = fetchWrapper,
}: KeywordSearchAutocompleteProps) {
  const [keywordInput, setKeywordInput] = useState<string>('')
  const [keywords, setKeywords] = useState<SuggestedKeywordsData[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [fetchError, setFetchError] = useState<Error | null>(null)

  const updateKeywords = async (vocab: string, page: number) => {
    const pageItems = await getData(keywordInput, vocab, (page - 1) * 5)
    setKeywords((prev) =>
      prev.map((keyword) =>
        keyword.vocab.toUpperCase() === vocab.toUpperCase()
          ? { ...keyword, items: pageItems.items }
          : keyword,
      ),
    )
  }

  useEffect(() => {
    setLoading(true)
    if (keywordInput.length >= 3) {
      const handler = setTimeout(async () => {
        try {
          const data = await fetchKeywords(keywordInput)
          setKeywords(data)
        } catch (error) {
          if (error instanceof Error) {
            setFetchError(error)
            setKeywords([])
          }
        }
        setLoading(false)
      }, 600)
      return () => {
        clearTimeout(handler)
      }
    } else {
      setKeywords([])
    }
    setLoading(false)
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
      loadingText={
        <Trans id='document_details_page_keywords_input_options_loading' />
      }
      noOptionsText={
        fetchError ? (
          <Trans id='document_details_page_keywords_input_options_fetch_error' />
        ) : keywordInput.length < 3 ? (
          <Trans id='document_details_page_keywords_input_default' />
        ) : (
          <Trans id='document_details_page_keywords_input_options_no_options' />
        )
      }
      onInputChange={(event, value) => {
        setKeywordInput(value)
      }}
      options={keywords
        .sort((a, b) =>
          a.vocab.toLowerCase().localeCompare(b.vocab.toLowerCase()),
        )
        .map((item) => item.items)
        .flat()}
      renderInput={(params) => (
        <TextField
          {...params}
          error={!!fetchError}
          helperText={
            fetchError ? (
              <Trans id='document_details_page_keywords_input_fetch_error_label' />
            ) : (
              ''
            )
          }
          slotProps={{
            input: {
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position='start'>
                  <IconButton>
                    <Add />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
      )}
      renderGroup={(params) => {
        const group = keywords.find((group) => group.vocab === params.group)
        return (
          <Box
            key={params.key}
            sx={{ marginLeft: '20px', marginTop: '10px', marginBottom: '30px' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Image
                src={
                  group
                    ? VOCABS[group?.vocab.toUpperCase()].icon
                    : '/icons/default.png'
                }
                alt={(group ? group.vocab.toUpperCase() : 'Vocab') + ' icon'}
                width={24}
                height={24}
              />
              <Typography sx={{ marginLeft: '15px', fontWeight: 'bold' }}>
                {params.group +
                  (group
                    ? ' - ' + VOCABS[group?.vocab.toUpperCase()].name
                    : '')}
              </Typography>
            </Box>
            <Box sx={{ marginTop: '10px', marginBottom: '10px' }}>
              {params.children}
            </Box>
            {group && group.total > group.items.length ? (
              <Pagination
                count={Math.ceil(group.total / 5)}
                onChange={async (event, page) =>
                  await updateKeywords(group.vocab.toLowerCase(), page)
                }
                sx={{ marginBottom: '20px' }}
              />
            ) : null}
            <Divider />
          </Box>
        )
      }}
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
