import { t } from '@lingui/core/macro'
import React, { useEffect, useMemo, useState } from 'react'
import {
  Autocomplete,
  AutocompleteRenderGroupParams,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  PaperProps,
  TextField,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import useStore from '@/stores/global_store'
import Highlighter from 'react-highlight-words'
import DoneIcon from '@mui/icons-material/Done'
import { IAgent } from '@/types/IAgent'
import { Person } from '@/types/Person'
import { ResearchUnit } from '@/types/ResearchUnit'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import * as Lingui from '@lingui/core'
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn'

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
  const [researchUnitsPage, setResearchUnitsPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchTags, setSearchTags] = useState<IAutoCompleteGroupTag[]>([
    { label: t`sidebar_search_people`, value: 'people', selected: true },
    {
      label: t`sidebar_search_research_units`,
      value: 'researchUnits',
      selected: true,
    },
  ])
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const theme = useTheme()

  const searchInputIsDisabled: boolean = useMemo<boolean>(() => {
    return !pathname.match(/^\/[a-z]{2}\/(documents|dashboard|expertise)/)
  }, [pathname])

  const {
    fetchPeopleByName,
    loading: peopleLoading,
    people = [],
    hasMore: hasMorePeople,
    total: totalPeople,
  } = useStore((state) => state.person)

  const {
    fetchResearchUnitsByName,
    loading: researchUnitsLoading,
    researchUnits = [],
    hasMore: hasMoreResearchUnits,
    total: totalResearchUnits,
  } = useStore((state) => state.researchUnit)

  const { currentPerspective, connectedUser } = useStore((state) => state.user)

  const lang = Lingui.i18n.locale

  useEffect(() => {
    const handler = setTimeout(() => {
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
    }, 500)
    return () => clearTimeout(handler) // Clear timeout if input changes before 2 seconds
  }, [fetchPeopleByName, peoplePage, searchTerm, searchTags])

  useEffect(() => {
    const handler = setTimeout(() => {
      const fetchData = async () => {
        if (
          searchTags.some(
            (tag) => tag.selected && tag.value === 'researchUnits',
          )
        ) {
          if (fetchResearchUnitsByName) {
            try {
              await fetchResearchUnitsByName({
                searchTerm,
                page: researchUnitsPage,
              })
            } catch (error) {
              console.error('Error fetching research units:', error)
            }
          }
        }
      }
      fetchData().catch((error) => {
        console.error('Error fetching data:', error)
      })
    }, 500)
    return () => clearTimeout(handler) // Clear timeout if input changes before 2 seconds
  }, [fetchResearchUnitsByName, researchUnitsPage, searchTerm, searchTags])

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
          (tag) => tag.selected && tag.value === 'researchUnits',
        ) &&
        hasMoreResearchUnits &&
        !researchUnitsLoading &&
        group === t`sidebar_search_research_units`
      ) {
        setResearchUnitsPage((prevPage) => prevPage + 1)
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

  const mergedOptions: IAutoCompleteOption<Person | ResearchUnit>[] =
    useMemo(() => {
      const mergedOptions: IAutoCompleteOption<Person | ResearchUnit>[] = []
      if (searchTags.some((tag) => tag.selected && tag.value === 'people')) {
        const peopleOptions = people
          .map((person) => {
            if (!person.slug) {
              console.log(
                `Person ${person.uid} is not selectable as it does not have a slug`,
              )
              return null
            }
            return {
              type: 'people',
              id: person.slug || 'nc', //TODO remove when slug will be non-nullable
              label: `${person.firstName} ${person.lastName}`,
              agent: person,
            }
          })
          .filter(Boolean) as IAutoCompleteOption<Person | ResearchUnit>[]
        mergedOptions.push(...peopleOptions)
      }
      if (
        searchTags.some((tag) => tag.selected && tag.value === 'researchUnits')
      ) {
        const researchUnitOptions: IAutoCompleteOption<ResearchUnit>[] =
          researchUnits
            .map((researchUnit) => {
              if (!researchUnit.slug) {
                console.log(
                  `Research unit ${researchUnit.uid} is not selectable as it does not have a slug`,
                )
                return null
              }
              const label: string =
                researchUnit.names.find((name) => name.language === lang)
                  ?.value ||
                researchUnit.names[0]?.value ||
                researchUnit.acronym ||
                t`sidebar_search_unknown_label`
              return {
                type: 'researchUnits',
                id: researchUnit.slug,
                label: label,
                agent: researchUnit,
              }
            })
            .filter(Boolean) as IAutoCompleteOption<ResearchUnit>[]
        mergedOptions.push(...researchUnitOptions)
      }

      return mergedOptions
    }, [people, researchUnits, searchTags, lang])

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
              : totalResearchUnits}
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
              icon={
                <DoneIcon
                  sx={
                    tag.selected ? { display: 'inherit' } : { display: 'none' }
                  }
                />
              }
            />
          ))}
        </Box>
        <Box>{paperProps.children}</Box>
      </Paper>
    )

    CustomPaper.displayName = 'CustomPaper'

    return CustomPaper
  }, [searchTags])

  const handlePerspectiveSelection = (
    _: React.SyntheticEvent,
    value: IAutoCompleteOption<Person | ResearchUnit> | null,
  ) => {
    if (value) {
      const params = new URLSearchParams(searchParams.toString())
      if (value.id) {
        params.set('perspective', value.id)
      } else {
        params.delete('perspective')
      }
      let targetPath = pathname

      // if we're on a details page, remove the UUID from the path
      const detailPattern = /^\/fr\/(documents)\/[0-9a-fA-F-]+$/
      const match = pathname.match(detailPattern)
      if (match) {
        // If it's a detail page, cut off the UUID
        targetPath = `/${match[1]}`
        params.delete('tab')
      }

      // Push updated query parameters without full page reload
      router.push(`${targetPath}?${params.toString()}`, { scroll: false })
    }
  }

  const backToMyPerspective = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('perspective')
    let targetPath = pathname
    // if we're on a details page, remove the UUID from the path
    const detailPattern = /^\/([a-z]{2}\/documents)\/[0-9a-fA-F-]+$/
    const match = pathname.match(detailPattern)
    if (match) {
      // If it's a detail page, cut off the UUID
      targetPath = `/${match[1]}`
      params.delete('tab')
    }

    // Push updated query parameters without full page reload
    router.push(`${targetPath}?${params.toString()}`, { scroll: false })
  }

  return (
    <>
      <Autocomplete
        onClose={() => {
          setSearchTerm(searchTerm)
        }}
        disabled={searchInputIsDisabled}
        onChange={handlePerspectiveSelection}
        renderGroup={renderGroup}
        disableCloseOnSelect={true}
        options={mergedOptions}
        getOptionLabel={(
          option: IAutoCompleteOption<Person | ResearchUnit>,
        ) => {
          return option.label
        }}
        groupBy={(option: IAutoCompleteOption<Person | ResearchUnit>) => {
          if (option.type == 'people') return t`sidebar_search_people`
          else if (option.type == 'researchUnits')
            return t`sidebar_search_research_units`
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
          setResearchUnitsPage(1)
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
        loading={peopleLoading || researchUnitsLoading} // Display loading when data is being fetched
        loadingText={<CircularProgress size={24} />} // Show spinner when loading
      />
      {connectedUser?.person?.uid !== currentPerspective?.uid && (
        <Button
          onClick={backToMyPerspective}
          sx={{
            fontFamily: 'Inter, Roboto, sans-serif',
            fontSize: theme.utils.pxToRem(14),
            fontWeight: theme.typography.fontWeightMedium,
            lineHeight: theme.typography.lineHeight.lineHeight24px,
            color: theme.palette.primaryContainer,
            '&:hover': {
              backgroundColor: theme.palette.sidebarItemHover,
              color: theme.palette.primaryContainer,
            },
          }}
          startIcon={<KeyboardReturnIcon />}
        >
          {t`sidebar_back_to_my_perspective`}
        </Button>
      )}
    </>
  )
}

export default SearchInput
