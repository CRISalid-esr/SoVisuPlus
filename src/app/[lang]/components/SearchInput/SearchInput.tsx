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
import { Person } from '@/types/Person'
import { ResearchStructure } from '@/types/ResearchStructure'
import { usePathname } from 'next/navigation'

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
    { label: t`sidebar_search_people`, value: 'people', selected: true },
    {
      label: t`sidebar_search_research_structures`,
      value: 'researchStructures',
      selected: true,
    },
  ])
  const pathname = usePathname() // Get the current path
  const lang = pathname.split('/')[1] // Extract the `lang` dynamic segment

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
            await fetchPeople({ searchTerm, page: peoplePage.toString() })
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

  const handleScroll = (e: React.UIEvent<HTMLDivElement>, group: string) => {
    const target = e.target as HTMLDivElement
    const bottom =
      target.scrollHeight === target.scrollTop + target.clientHeight
    if (bottom) {
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
        !researchStructuresLoading &&
        group === 'researchStructures'
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
      ...(searchTags.some((tag) => tag.selected && tag.value === 'people')
        ? people.map((people) => ({
            ...people,
            type: 'people',
          }))
        : []),
      ...(searchTags.some(
        (tag) => tag.selected && tag.value === 'researchStructures',
      )
        ? researchStructures.map((researchStructure) => ({
            ...researchStructure,
            type: 'researchStructures',
          }))
        : []),
    ]
  }, [people, researchStructures, searchTags])

  const renderGroup = (params: AutocompleteRenderGroupParams) => {
    return (
      <Box
        onScroll={(e) => {
          handleScroll(e, params.group)
        }}
        sx={{
          maxHeight: 150, // Max height for each group
          overflowY: 'auto', // Enable scrolling
        }}
        component={'li'}
        {...params}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1 }}>
          <Typography variant='body2'>
            {params.group} (
            {params.group === 'people' ? totalPeople : totalResearchStructures})
          </Typography>
        </Box>
        <ul>{params.children}</ul>
      </Box>
    )
  }

  console.log('people', people)

  return (
    <Autocomplete
      onClose={() => {}}
      renderGroup={renderGroup}
      disableCloseOnSelect={true}
      options={mergedOptions}
      getOptionLabel={(option: ResearchStructure | Person): string => {
        if (option.type == 'people') {
          return `${option.firstName} ${option.lastName}`
        }
        if (option.type == 'researchStructures') {
          return (option.names ? option.names[lang] : option.acronym) || 'n/c'
        }
        return 'n/c'
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
    />
  )
}

export default SearchInput
