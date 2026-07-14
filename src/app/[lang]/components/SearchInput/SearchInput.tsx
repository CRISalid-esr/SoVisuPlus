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
import { IAgent, OrganizationGroup, ORGANIZATION_GROUPS } from '@/types/IAgent'
import { Person } from '@/types/Person'
import { OrganizationUnit } from '@/types/OrganizationUnit'
import { usePathname, useSearchParams } from 'next/navigation'
import { useGuardedRouter } from '@/app/[lang]/components/NavigationGuard/NavigationGuardProvider'
import * as Lingui from '@lingui/core'
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn'
import { useSession } from 'next-auth/react'
import { abilityFromAuthzContext } from '@/app/auth/ability'
import { PermissionAction } from '@/types/Permission'

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

const initialOrgPages = (): Record<OrganizationGroup, number> =>
  Object.fromEntries(ORGANIZATION_GROUPS.map((group) => [group, 1])) as Record<
    OrganizationGroup,
    number
  >

const SearchInput: React.FC = () => {
  const [peoplePage, setPeoplePage] = useState(1)
  const [orgPages, setOrgPages] =
    useState<Record<OrganizationGroup, number>>(initialOrgPages())
  const [searchTerm, setSearchTerm] = useState('')
  const guardedRouter = useGuardedRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const theme = useTheme()
  const { data: session } = useSession()

  const isAccountPage = Boolean(pathname.match(/^\/[a-z]{2}\/account/))

  const ability = useMemo(
    () => abilityFromAuthzContext(session?.user?.authz),
    [session?.user?.authz],
  )

  // A synthetic Person with an empty perimeter: self-scoped rules won't match it,
  // but global/wide-scope account_editor rules will. This detects "wider than self" scope.
  const canManageOtherPeopleIdentifiers = useMemo(() => {
    const foreignPerson = {
      authzProperties: {
        __type: 'Person',
        perimeter: { Person: [], ResearchUnit: [] },
      },
    }
    return ability.can(
      PermissionAction.update,
      foreignPerson as unknown as Person,
      'identifiers',
    )
  }, [ability])

  const searchInputIsDisabled: boolean = useMemo<boolean>(() => {
    if (isAccountPage) return !canManageOtherPeopleIdentifiers
    return !pathname.match(/^\/[a-z]{2}\/(documents|dashboard|expertise)/)
  }, [pathname, isAccountPage, canManageOtherPeopleIdentifiers])

  const groupLabels: Record<OrganizationGroup, string> = useMemo(
    () => ({
      institution: t`sidebar_search_institutions`,
      research_unit: t`sidebar_search_research_units`,
      other_structure: t`sidebar_search_other_structures`,
      team: t`sidebar_search_teams`,
    }),
    [],
  )

  const allTags = useMemo<IAutoCompleteGroupTag[]>(
    () => [
      { label: t`sidebar_search_people`, value: 'people', selected: true },
      ...ORGANIZATION_GROUPS.map((group) => ({
        label: groupLabels[group],
        value: group,
        selected: true,
      })),
    ],
    [groupLabels],
  )

  // On the account page, only search for people (not organizations)
  const [searchTags, setSearchTags] = useState<IAutoCompleteGroupTag[]>(allTags)

  useEffect(() => {
    if (isAccountPage) {
      setSearchTags([
        { label: t`sidebar_search_people`, value: 'people', selected: true },
      ])
    } else {
      setSearchTags(allTags)
    }
  }, [isAccountPage, allTags])

  const {
    fetchPeopleByName,
    loading: peopleLoading,
    people = [],
    hasMore: hasMorePeople,
    total: totalPeople,
  } = useStore((state) => state.person)

  const { fetchOrganizationsByName, byGroup } = useStore(
    (state) => state.organization,
  )

  const organizationsLoading = ORGANIZATION_GROUPS.some(
    (group) => byGroup[group].loading,
  )

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
        for (const group of ORGANIZATION_GROUPS) {
          if (
            searchTags.some((tag) => tag.selected && tag.value === group) &&
            fetchOrganizationsByName
          ) {
            try {
              await fetchOrganizationsByName({
                searchTerm,
                page: orgPages[group],
                group,
              })
            } catch (error) {
              console.error(`Error fetching ${group} organizations:`, error)
            }
          }
        }
      }
      fetchData().catch((error) => {
        console.error('Error fetching data:', error)
      })
    }, 500)
    return () => clearTimeout(handler) // Clear timeout if input changes before 2 seconds
  }, [fetchOrganizationsByName, orgPages, searchTerm, searchTags])

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
      for (const orgGroup of ORGANIZATION_GROUPS) {
        if (
          searchTags.some((tag) => tag.selected && tag.value === orgGroup) &&
          byGroup[orgGroup].hasMore &&
          !byGroup[orgGroup].loading &&
          group === groupLabels[orgGroup]
        ) {
          setOrgPages((prevPages) => ({
            ...prevPages,
            [orgGroup]: prevPages[orgGroup] + 1,
          }))
        }
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

  const mergedOptions: IAutoCompleteOption<Person | OrganizationUnit>[] =
    useMemo(() => {
      const mergedOptions: IAutoCompleteOption<Person | OrganizationUnit>[] = []
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
          .filter(Boolean) as IAutoCompleteOption<Person | OrganizationUnit>[]
        mergedOptions.push(...peopleOptions)
      }
      for (const group of ORGANIZATION_GROUPS) {
        if (!searchTags.some((tag) => tag.selected && tag.value === group)) {
          continue
        }
        const organizationOptions: IAutoCompleteOption<OrganizationUnit>[] =
          byGroup[group].organizations
            .map((organization) => {
              if (!organization.slug) {
                console.log(
                  `Organization ${organization.uid} is not selectable as it does not have a slug`,
                )
                return null
              }
              const label: string =
                organization.names.find((name) => name.language === lang)
                  ?.value ||
                organization.names[0]?.value ||
                organization.acronym ||
                t`sidebar_search_unknown_label`
              return {
                type: group,
                id: organization.slug,
                label: label,
                agent: organization,
              }
            })
            .filter(Boolean) as IAutoCompleteOption<OrganizationUnit>[]
        mergedOptions.push(...organizationOptions)
      }

      return mergedOptions
    }, [people, byGroup, searchTags, lang])

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
              : (byGroup[
                  ORGANIZATION_GROUPS.find(
                    (group) => groupLabels[group] === params.group,
                  ) ?? 'research_unit'
                ]?.total ?? 0)}
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
    value: IAutoCompleteOption<Person | OrganizationUnit> | null,
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

      // Push updated query parameters without full page reload (guarded so an
      // unsaved Authors tab prompts before switching perspective).
      guardedRouter.push(`${targetPath}?${params.toString()}`, {
        scroll: false,
      })
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

    // Push updated query parameters without full page reload (guarded).
    guardedRouter.push(`${targetPath}?${params.toString()}`, { scroll: false })
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
          option: IAutoCompleteOption<Person | OrganizationUnit>,
        ) => {
          return option.label
        }}
        groupBy={(option: IAutoCompleteOption<Person | OrganizationUnit>) => {
          if (option.type == 'people') return t`sidebar_search_people`
          return groupLabels[option.type as OrganizationGroup] ?? ''
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
          // Bail out when already on page 1 everywhere: a new object identity
          // on every input event would loop with MUI's 'reset' events.
          setOrgPages((prevPages) =>
            Object.values(prevPages).every((page) => page === 1)
              ? prevPages
              : initialOrgPages(),
          )
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
        loading={peopleLoading || organizationsLoading} // Display loading when data is being fetched
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
