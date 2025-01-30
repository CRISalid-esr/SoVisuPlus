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
import Highlighter from 'react-highlight-words'
import DoneIcon from '@mui/icons-material/Done'
import DeleteIcon from '@mui/icons-material/Delete'
import { IAgent } from '@/types/IAgent'
import { Person } from '@/types/Person'
import { ResearchStructure } from '@/types/ResearchStructure'
import * as Lingui from '@lingui/core'

console.log(Lingui)

interface IAutoCompleteGroupTag {
  label: string
  value: string
  selected: boolean
}

interface IAutoCompleteOption<T extends IAgent> {
  type: string
  id: string
  label: string
  agent: T
}

const SearchInput: React.FC = () => {
  const [peoplePage, setPeoplePage] = useState(1)
  const [researchStructuresPage, setResearchStructuresPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchTags, setSearchTags] = useState<IAutoCompleteGroupTag[]>([
    { label: t`sidebar_search_people`, value: 'people', selected: true },
    {
      label: t`sidebar_search_research_structures`,
      value: 'researchStructures',
      selected: true,
    },
  ])

  const theme = useTheme()

  const {
    fetchPeopleByName,
    loading: peopleLoading,
    people = [],
    hasMore: hasMorePeople,
    total: totalPeople,
  } = useStore((state) => state.person)

  const {
    fetchResearchStructuresByName,
    loading: researchStructuresLoading,
    researchStructures = [],
    hasMore: hasMoreResearchStructures,
    total: totalResearchStructures,
  } = useStore((state) => state.researchStructure)

  const { setPerspective } = useStore((state) => state.user)

  const lang = Lingui.i18n.locale

  useEffect(() => {
    const fetchData = async () => {
      if (searchTags.some((tag) => tag.selected && tag.value === 'people')) {
        if (fetchPeopleByName) {
          try {
            await fetchPeopleByName({ searchTerm, page: peoplePage })
          } catch (error) {
            console.error('Error fetching people:', error)
          }
        }
      }
    }
    fetchData().catch((error) => {
      console.error('Error fetching data:', error)
    })
  }, [fetchPeopleByName, peoplePage, searchTerm, searchTags])

  useEffect(() => {
    const fetchData = async () => {
      if (
        searchTags.some(
          (tag) => tag.selected && tag.value === 'researchStructures',
        )
      ) {
        if (fetchResearchStructuresByName) {
          try {
            await fetchResearchStructuresByName({
              searchTerm,
              searchLang: lang,
              page: researchStructuresPage,
            })
          } catch (error) {
            console.error('Error fetching research structures:', error)
          }
        }
      }
    }
    fetchData().catch((error) => {
      console.error('Error fetching data:', error)
    })
  }, [
    fetchResearchStructuresByName,
    researchStructuresPage,
    searchTerm,
    searchTags,
  ])

  const handleScroll = (e: React.UIEvent<HTMLLIElement>, group: string) => {
    const target = e.target as HTMLLIElement
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
    setSearchTags((prevTags: IAutoCompleteGroupTag[]) =>
      prevTags.map((tag) =>
        tag.value === tagValue ? { ...tag, selected: !tag.selected } : tag,
      ),
    )
  }

  const mergedOptions: IAutoCompleteOption<Person | ResearchStructure>[] =
    useMemo(() => {
      const mergedOptions: IAutoCompleteOption<Person | ResearchStructure>[] =
        []
      if (searchTags.some((tag) => tag.selected && tag.value === 'people')) {
        const peopleOptions = people.map((person) => {
          return {
            type: 'people',
            id: person.uid,
            label: `${person.firstName} ${person.lastName}`,
            agent: person,
          }
        })
        mergedOptions.push(...peopleOptions)
      }
      if (
        searchTags.some(
          (tag) => tag.selected && tag.value === 'researchStructures',
        )
      ) {
        const researchStructureOptions: IAutoCompleteOption<ResearchStructure>[] =
          researchStructures.map((researchStructure) => {
            const label: string =
              researchStructure.names.filter(
                (name) => name.language === lang,
              )[0]?.value ||
              researchStructure.acronym ||
              t`sidebar_search_unknown_label`
            return {
              type: 'researchStructures',
              id: researchStructure.uid,
              label: label,
              agent: researchStructure,
            }
          })
        mergedOptions.push(...researchStructureOptions)
      }
      return mergedOptions
    }, [people, researchStructures, searchTags, lang])

  const renderGroup = (params: AutocompleteRenderGroupParams) => {
    const { key, ...rest } = params
    return (
      <Box
        key={key}
        onScroll={(e) => {
          handleScroll(e, params.group)
        }}
        sx={{
          maxHeight: 150, // Max height for each group
          overflowY: 'auto', // Enable scrolling
        }}
        component={'li'}
        {...rest}
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

  const customPaper = useMemo(() => {
    const CustomPaper = (paperProps: PaperProps) => (
      <Paper onMouseDown={(event) => event.preventDefault()}>
        <Box
          sx={{
            p: 2,
            display: 'flex',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          {searchTags.map((tag) => (
            <Chip
              key={tag.value}
              label={tag.label}
              onClick={() => handleTagClick(tag.value)}
              color={tag.selected ? 'primary' : 'default'}
              sx={{ cursor: 'pointer' }}
              icon={tag.selected ? <DeleteIcon /> : <DoneIcon />}
            />
          ))}
        </Box>
        <Box>{paperProps.children}</Box>
      </Paper>
    )

    CustomPaper.displayName = 'CustomPaper'

    return CustomPaper
  }, [searchTags])

  const handlePerspectiveSelections = (
    event: React.SyntheticEvent,
    value: IAutoCompleteOption<Person | ResearchStructure> | null,
  ) => {
    if (value) {
      setPerspective(value.agent)
    }
  }

  return (
    <Autocomplete
      onClose={() => {
        setSearchTerm(searchTerm)
      }}
      onChange={handlePerspectiveSelections}
      renderGroup={renderGroup}
      disableCloseOnSelect={true}
      options={mergedOptions}
      getOptionLabel={(
        option: IAutoCompleteOption<Person | ResearchStructure>,
      ) => {
        return option.label
      }}
      groupBy={(option: IAutoCompleteOption<Person | ResearchStructure>) => {
        if (option.type == 'people') return t`sidebar_search_people`
        else if (option.type == 'researchStructures')
          return t`sidebar_search_research_structures`
        return ''
      }}
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
      onInputChange={(_, newInputValue, reason) => {
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
        return (
          <li {...props} key={option.id}>
            <Highlighter
              highlightClassName='highlight'
              searchWords={[inputValue]}
              autoEscape
              textToHighlight={option.label}
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
