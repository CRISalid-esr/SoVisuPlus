import React, { useEffect, useMemo, useState } from 'react'
import {
  Autocomplete,
  AutocompleteRenderGroupParams,
  Box,
  Chip,
  CircularProgress,
  Paper,
  PaperProps,
  TextField,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { t } from '@lingui/macro'
import useStore from '@/stores/global_store'
import { Person } from '@/types/Person'
import { ResearchStructure } from '@/types/ResearchStructure'
import { usePathname } from 'next/navigation'
import Highlighter from 'react-highlight-words'
import DoneIcon from '@mui/icons-material/Done'
import DeleteIcon from '@mui/icons-material/Delete'
interface Tag {
  label: string
  value: string
  selected: boolean
}

const SearchInput: React.FC = () => {
  const [peoplePage, setPeoplePage] = useState(1)
  const [researchStructuresPage, setResearchStructuresPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchTags, setSearchTags] = useState<Tag[]>([
    { label: t`sidebar_search_people`, value: 'people', selected: true },
    {
      label: t`sidebar_search_research_structures`,
      value: 'researchStructures',
      selected: true,
    },
  ])

  const theme = useTheme()

  const {
    fetchPeople,
    loading: peopleLoading,
    people = [],
    hasMore: hasMorePeople,
    total: totalPeople,
  } = useStore((state) => state.person)

  const {
    fetchResearchStructures,
    loading: researchStructuresLoading,
    researchStructures = [],
    hasMore: hasMoreResearchStructures,
    total: totalResearchStructures,
  } = useStore((state) => state.researchStructure)

  const pathname = usePathname()
  const lang = pathname ? pathname.split('/')[1] : ''

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
        !peopleLoading &&
        group === t`sidebar_search_people`
      ) {
        setPeoplePage((prevPage) => prevPage + 1)
      }
      if (
        searchTags.some(
          (tag) => tag.selected && tag.value === 'researchStructures',
        ) &&
        hasMoreResearchStructures &&
        !researchStructuresLoading &&
        group === t`sidebar_search_research_structures`
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
        ? people?.map((people) => ({
            ...people,
            type: 'people',
          }))
        : []),
      ...(searchTags.some(
        (tag) => tag.selected && tag.value === 'researchStructures',
      )
        ? researchStructures?.map((researchStructure) => ({
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
        <Box
          sx={{
            position: 'sticky',
            top: 0, // Fixes the title at the top of the group
            zIndex: 1, // Ensure the title stays on top of other content
            backgroundColor: theme.palette.background.paper, // Set a background to prevent overlap
            display: 'flex',
            justifyContent: 'space-between',
            p: 1,
          }}
        >
          <Typography variant='body2'>
            {params.group} (
            {params.group === t`sidebar_search_people`
              ? totalPeople
              : totalResearchStructures}
            )
          </Typography>
        </Box>
        <ul>{params.children}</ul>
      </Box>
    )
  }

  const customPaper = useMemo(
    () => (paperProps: PaperProps) => (
      <Paper onMouseDown={(event) => event.preventDefault()}>
        <Box
          sx={{
            p: 2,
            display: 'flex',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          {searchTags.map((tag) => {
            return (
              <Chip
                key={tag.value}
                label={tag.label}
                onClick={() => handleTagClick(tag.value)}
                color={tag.selected ? 'primary' : 'default'}
                sx={{ cursor: 'pointer' }}
                icon={tag.selected ? <DeleteIcon /> : <DoneIcon />}
              />
            )
          })}
        </Box>
        <Box>{paperProps.children}</Box>
      </Paper>
    ),
    [searchTags],
  )

  return (
    <Autocomplete
      onClose={() => {
        setSearchTerm(searchTerm)
      }}
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
      groupBy={(option) => {
        if (option.type == 'people') return t`sidebar_search_people`
        else if (option.type == 'researchStructures')
          return t`sidebar_search_research_structures`
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
        paper: customPaper,
      }}
      fullWidth
      inputValue={searchTerm}
      onInputChange={(e, newInputValue, reason) => {
        if (reason === 'reset') {
          setSearchTerm(searchTerm)
        } else {
          setSearchTerm(newInputValue)
        }
        setPeoplePage(1)
        setResearchStructuresPage(1)
      }}
      filterOptions={(x) => x} // Disables filtering
      renderOption={(props, option, { inputValue }) => {
        const label =
          option.type === 'people'
            ? `${option.firstName} ${option.lastName}`
            : (option.names ? option.names[lang] : option.acronym) || 'n/c'

        return (
          <li {...props} key={option.id}>
            <Highlighter
              highlightClassName='highlight'
              searchWords={[inputValue]}
              autoEscape
              textToHighlight={label}
            />
          </li>
        )
      }}
      sx={{ mb: 2 }}
      loading={peopleLoading || researchStructuresLoading} // Display loading when data is being fetched
      loadingText={<CircularProgress size={24} />} // Show spinner when loading
    />
  )
}

export default SearchInput
