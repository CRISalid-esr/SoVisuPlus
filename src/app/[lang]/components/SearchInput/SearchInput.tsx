import React, { useEffect, useState } from 'react'
import {
  Autocomplete,
  AutocompleteRenderGroupParams,
  Box,
  TextField,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { t } from '@lingui/macro'
import useStore from '@/stores/global_store'
import CustomPaper from '@/components/CustomPaper'
import { Person } from '@/types/Person'
import { ResearchStructure } from '@/types/ResearchStructure'

interface Tag {
  label: string
  value: string
  selected: boolean
}

const SearchInput: React.FC = () => {
  const [peoplePage, setPeoplePage] = useState(1)
  const [researchStructuresPage, setResearchStructuresPage] = useState(1)
  const theme = useTheme()
  const [searchTerm, setSearchTerm] = useState('')
  const [searchTags, setSearchTags] = useState<Tag[]>([
    { label: 'Chercheurs', value: 'people', selected: true },
    {
      label: 'Unités de recherche',
      value: 'researchStructures',
      selected: false,
    },
  ])

  const {
    fetchPeople,
    loading: peopleLoading,
    people,
    hasMore: hasMorePeople,
    total: totalPeople,
  } = useStore((state) => state.person)

  const {
    fetchResearchStructures,
    loading: researchStructuresLoading,
    researchStructures,
    hasMore: hasMoreResearchStructures,
    total: totalResearchStructures,
  } = useStore((state) => state.researchStructure)

  useEffect(() => {
    if (searchTags.some((tag) => tag.selected && tag.value === 'people')) {
      fetchPeople({ searchTerm, peoplePage: peoplePage.toString() })
    }
  }, [fetchPeople, peoplePage, searchTerm, searchTags])

  useEffect(() => {
    if (
      searchTags.some(
        (tag) => tag.selected && tag.value === 'researchStructures',
      )
    ) {
      fetchResearchStructures({
        searchTerm,
        page: researchStructuresPage,
      })
    }
  }, [fetchResearchStructures, researchStructuresPage, searchTerm, searchTags])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    const bottom =
      target.scrollHeight === target.scrollTop + target.clientHeight
    if (bottom) {
      // Trigger fetch for selected tags if more data is available
      if (
        searchTags.some((tag) => tag.selected && tag.value === 'people') &&
        hasMorePeople &&
        !peopleLoading
      ) {
        setPeoplePage((prevPage) => prevPage + 1)
      }
      if (
        searchTags.some(
          (tag) => tag.selected && tag.value === 'researchStructures',
        ) &&
        hasMoreResearchStructures &&
        !researchStructuresLoading
      ) {
        setResearchStructuresPage((prevPage) => prevPage + 1)
      }
    }
  }

  const handleTagClick = (tagValue: string) => {
    setSearchTags((prevTags: Tag[]) =>
      prevTags.map((tag) =>
        tag.value === tagValue ? { ...tag, selected: !tag.selected } : tag,
      ),
    )
  }

  const mergedOptions: (Person | ResearchStructure)[] = [
    ...(people || []).map((person) => ({ ...person, type: 'people' })),
    ...(researchStructures || []).map((structure) => ({
      ...structure,
      type: 'researchStructures',
    })),
  ]
  console.log('totalResearchStructures', totalResearchStructures)

  const renderGroup = (params: AutocompleteRenderGroupParams) => {
    const count =
      params.group === 'people' ? totalPeople : totalResearchStructures
    return (
      <li {...params}>
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
        return option instanceof Person
          ? `${option.firstName} ${option.lastName}`
          : option.names['fr']
      }}
      groupBy={(option) => {
        if (option instanceof Person) {
          return 'Chercheur'
        } else if (option instanceof ResearchStructure) {
          return 'Unité de recherche'
        }
        return 'Autre'
      }} // Group options by type (Chercheur, Unité de recherche)
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
        paper: (props) => (
          <CustomPaper
            searchTags={searchTags}
            handleTagClick={(tag: string) => handleTagClick(tag)}
            {...props}
          />
        ),
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
