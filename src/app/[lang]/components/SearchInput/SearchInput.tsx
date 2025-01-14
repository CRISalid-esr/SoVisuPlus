import React, { useEffect, useState } from 'react'
import {
  Box,
  TextField,
  Typography,
  Autocomplete,
  Paper,
  Chip,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { t } from '@lingui/macro'
import useStore from '@/stores/global_store'

interface Tag {
  label: string
  value: string
  selected: boolean
}

interface SearchInputProps {}

const SearchInput: React.FC<SearchInputProps> = () => {
  const [pagePersons, setPagePersons] = useState(1)
  const [pageResearchStructures, setPageResearchStructures] = useState(1)
  const theme = useTheme()
  const [searchTerm, setSearchTerm] = useState('')
  const [searchTags, setSearchTags] = useState<Tag[]>([
    { label: 'Chercheurs', value: 'persons', selected: true },
    { label: 'Unités de recherche', value: 'researchStructures', selected: false },
  ])

  const {
    fetchPersons,
    loading: personsLoading,
    persons,
    hasMore: hasMorePersons,
    total: totalPersons,
  } = useStore((state) => state.person)

  const {
    fetchResearchStructures,
    loading: researchStructuresLoading,
    researchStructures,
    hasMore: hasMoreResearchStructures,
    total: totalResearchStructures,
  } = useStore((state) => state.researchStructure)

  useEffect(() => {
    if (searchTags.some((tag) => tag.selected && tag.value === 'persons')) {
      fetchPersons({ searchTerm, pagePersons: pagePersons.toString() })
    }
  }, [fetchPersons, pagePersons, searchTerm, searchTags])

  useEffect(() => {
    if (
      searchTags.some((tag) => tag.selected && tag.value === 'researchStructures')
    ) {
      fetchResearchStructures({
        searchTerm,
        pageResearchStructures: pageResearchStructures.toString(),
      })
    }
  }, [fetchResearchStructures, pageResearchStructures, searchTerm, searchTags])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom =
      e.target.scrollHeight === e.target.scrollTop + e.target.clientHeight
    if (bottom) {
      // Trigger fetch for selected tags if more data is available
      if (
        searchTags.some((tag) => tag.selected && tag.value === 'persons') &&
        hasMorePersons &&
        !personsLoading
      ) {
        setPagePersons((prevPage) => prevPage + 1)
      }
      if (
        searchTags.some(
          (tag) => tag.selected && tag.value ===  "researchStructures",
        ) &&
        hasMoreResearchStructures &&
        !researchStructuresLoading
      ) {
        setPageResearchStructures((prevPage) => prevPage + 1)
      }
    }
  }

  const handleClickTag = (tagValue: string) => {
    setSearchTags((prevTags) =>
      prevTags.map((tag) =>
        tag.value === tagValue ? { ...tag, selected: !tag.selected } : tag,
      ),
    )
  }

  const CustomPaper = (props: any) => (
    <Paper
      {...props}
      onMouseDown={(event: { preventDefault: () => any }) =>
        event.preventDefault()
      }
    >
      <Box
        sx={{
          p: 5,
          display: 'flex',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        {searchTags.map((tag) => (
          <Chip
            key={tag.value}
            label={tag.label}
            onClick={() => handleClickTag(tag.value)}
            color={tag.selected ? 'primary' : 'default'}
            sx={{ cursor: 'pointer' }}
          />
        ))}
      </Box>
      <Box>{props.children}</Box>
    </Paper>
  )

  const mergedOptions = [
    ...persons.map((person) => ({ ...person, type: 'persons' })),
    ...researchStructures.map((structure) => ({
      ...structure,
      type: 'researchStructures',
    })),
  ]
console.log('totalResearchStructures',totalResearchStructures)

  const renderGroup = (params: any) => {
    const count =
      params.group === 'persons' ? totalPersons : totalResearchStructures
    return (
      <li {...params.other}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1 }}>
          <Typography variant='body2'>
            {params.group} ({count})
          </Typography>
        </Box>
        <ul>{params.children}</ul>
      </li>
    )
  }

  return (
    <Autocomplete
      onClose={() => {}}
      renderGroup={renderGroup}
      disableCloseOnSelect={true}
      options={mergedOptions}
      getOptionLabel={(option) => {
        console.log('option',option)
        return option.type === 'persons'
          ? `${option.firstName} ${option.lastName}`
          : option.names['fr']
      }}
      groupBy={(option) => option.type} // Group options by type (Chercheur, Unité de recherche)
      renderInput={(params) => (
        <TextField
          {...params}
          sx={{
            backgroundColor: theme.palette.white,
            borderRadius: theme.utils.pxToRem(8),
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                border: 'none',
              },
            },
            '& .MuiInputBase-input': {
              height: '100%',
              display: 'flex',
              alignItems: 'center',
            },
            '& .MuiInputBase-input::placeholder': {
              fontSize: theme.utils.pxToRem(16),
              fontWeight: theme.typography.fontWeightRegular,
              color: theme.palette.primary.main,
              opacity: 1,
              lineHeight: theme.typography.lineHeight.lineHeight24px,
            },
          }}
          placeholder={t`sidebar_search_placeholder`}
          fullWidth
        />
      )}
      slots={{
        paper: (props) => <CustomPaper {...props} />,
      }}
      fullWidth
      inputValue={searchTerm}
      onInputChange={(e, newInputValue) => setSearchTerm(newInputValue)}
      sx={{ mb: 2 }}
      onScroll={handleScroll}
    />
  )
}

export default SearchInput
