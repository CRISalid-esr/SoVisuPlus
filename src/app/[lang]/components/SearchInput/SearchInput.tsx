import React, { useEffect, useMemo, useState } from 'react'
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
import { ResearchStructure } from '@/types/ResearchStructure'
import { Person } from '@/types/Person'

interface Tag {
  label: string
  value: string
  selected: boolean
}

const isPerson = (option: Person | ResearchStructure): option is Person =>
  option.type === 'people'

const isResearchStructure = (
  option: Person | ResearchStructure,
): option is ResearchStructure => option.type === 'researchStructures'

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
    const fetchData = async () => {
      if (searchTags.some((tag) => tag.selected && tag.value === 'people')) {
        if (fetchPeople) {
          try {
            await fetchPeople({ searchTerm, peoplePage: peoplePage.toString() })
          } catch (error) {
            console.error('Error fetching people:', error)
          }
        }
      }
    }
    fetchData()
  }, [fetchPeople, peoplePage, searchTerm, searchTags])

  useEffect(() => {
    const fetchData = async () => {
      if (
        searchTags.some(
          (tag) => tag.selected && tag.value === 'researchStructures',
        )
      ) {
        if (fetchResearchStructures) {
          try {
            await fetchResearchStructures({
              searchTerm,
              page: researchStructuresPage,
            })
          } catch (error) {
            console.error('Error fetching research structures:', error)
          }
        }
      }
    }

    fetchData()
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

  const mergedOptions = useMemo(() => {
    return [
      ...(people || []).map((person) => ({ ...person, type: 'people' })),
      ...(researchStructures || []).map((structure) => ({
        ...structure,
        type: 'researchStructures',
      })),
    ]
  }, [people, researchStructures])

  const renderGroup = (params: AutocompleteRenderGroupParams) => {
    const count =
      params.group === 'people' ? totalPeople : totalResearchStructures
    return (
      <li {...params} key={params.group}>
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
      getOptionLabel={(option): string => {
        if (isPerson(option)) {
          return `${option.firstName} ${option.lastName}`
        }
        if (isResearchStructure(option)) {
          return (option.names ? option.names[0] : option.acronym) || 'n/c'
        }
        return 'n/c'
      }}
      groupBy={(option) => {
        if (option.type == 'people') {
          return 'Chercheur'
        } else if (option.type == 'researchStructures') {
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
            // generate unique random kay
            key={Math.random()}
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
