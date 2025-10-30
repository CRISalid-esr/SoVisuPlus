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
import { Concept } from '@/types/Concept'
import { Literal } from '@/types/Literal'
import useStore from '@/stores/global_store'

export type SuggestedKeyword = {
  concept: Concept
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
                { num: Vocab.iriToIdentifier(item.iri, item.scheme) },
                { text: item.best_label?.text, vocab: item.scheme },
                {
                  concept: new Concept(
                    item.iri,
                    item.pref
                      ? item.pref.map((label) =>
                          Literal.fromObject({
                            value: label.text,
                            language: label.lang,
                          }),
                        )
                      : [],
                    item.alt
                      ? item.alt.map((label) =>
                          Literal.fromObject({
                            value: label.text,
                            language: label.lang,
                          }),
                        )
                      : [],
                    item.iri,
                  ),
                },
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
  const [add, setAdd] = useState<boolean>(false)
  const [selectedConcept, setSelectedConcept] = useState<SuggestedKeyword>()

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

  const addConcepts = useStore((state) => state.document.addConcepts)

  const onAddConcept = async () => {
    if (selectedConcept?.concept) {
      await addConcepts([selectedConcept.concept])
    }
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
      onChange={(event, value) => {
        if (value) {
          setAdd(true)
          setSelectedConcept(value)
        } else {
          setAdd(false)
          setSelectedConcept(undefined)
        }
      }}
      onInputChange={(event, value) => {
        setSelectedConcept(undefined)
        setAdd(false)
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
                  <IconButton disabled={!add} onClick={onAddConcept}>
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
                {params.group}
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
            <Tooltip title={option.concept.uid}>
              <Link
                href={option.concept.uid}
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
