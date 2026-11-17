'use client'

import { t } from '@lingui/core/macro'
import * as Lingui from '@lingui/core'
import {
  Box,
  FormControlLabel,
  IconButton,
  Link as MuiLink,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
  MaterialReactTable,
  MRT_ColumnDef,
  MRT_ColumnSizingState,
  MRT_PaginationState,
  MRT_SortingState,
  useMaterialReactTable,
} from 'material-react-table'
import { alphabeticalSortColumn } from '@/components/alphabeticalSortColumn'
import { sortPriorityColumn } from '@/components/sortPriorityColumn'
import Image from 'next/image'
import NextLink from 'next/link'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  EMPTY_PRINCIPAL,
  hasWiderThanSelfPersonScope,
} from '@/app/auth/ability'
import useStore from '@/stores/global_store'
import { Localization } from '@/types/Localization'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { StructureMemberJson } from '@/types/StructureMember'
import RateBar from './RateBar'
import ProfileValidatedBadge from '@/app/[lang]/account/components/profileValidation/ProfileValidatedBadge'
import { MAX_NAME_SEARCH_QUERY_LENGTH } from '@/utils/fuzzySearch/constants'
import { searchFieldProps } from '@/components/searchFieldProps'

const IDENTIFIER_DISPLAY_ORDER: PersonIdentifierType[] = [
  PersonIdentifierType.orcid,
  PersonIdentifierType.idref,
  PersonIdentifierType.idhals,
  PersonIdentifierType.idhali,
]

/** Default order: position, then name (mirrors the server default). */
const DEFAULT_SORTING: MRT_SortingState = [
  { id: 'position', desc: false },
  { id: 'name', desc: false },
]

/** Narrowest width a column can be fitted or resized to. */
const MIN_COLUMN_SIZE = 50

/**
 * Scales the columns' default sizes down so they all fit in `width`
 * (wider containers are filled by the grid layout's flex growth).
 */
const fitColumnSizes = (
  columns: { id: string; size: number }[],
  width: number,
): MRT_ColumnSizingState => {
  const total = columns.reduce((sum, column) => sum + column.size, 0)
  const ratio = Math.min(1, width / total)
  return Object.fromEntries(
    columns.map(({ id, size }) => [
      id,
      Math.max(MIN_COLUMN_SIZE, Math.floor(size * ratio)),
    ]),
  )
}

/** Single-line text, cut with an ellipsis when the column is too narrow. */
const CellText = ({ children }: { children: React.ReactNode }) => (
  <Typography variant='body2' noWrap>
    {children}
  </Typography>
)

const formatDate = (value: string | null, locale: string): string =>
  value ? new Date(value).toLocaleDateString(locale) : '—'

/** Identifier icons of a member; validated ones get a green outline. */
export const MemberIdentifierIcons = ({
  identifiers,
}: {
  identifiers: StructureMemberJson['identifiers']
}) => {
  const displayed = identifiers
    .map(PersonIdentifier.fromJson)
    .filter((identifier) => IDENTIFIER_DISPLAY_ORDER.includes(identifier.type))
    .sort(
      (a, b) =>
        IDENTIFIER_DISPLAY_ORDER.indexOf(a.type) -
        IDENTIFIER_DISPLAY_ORDER.indexOf(b.type),
    )
  if (displayed.length === 0) {
    return <Typography variant='body2'>—</Typography>
  }
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      {displayed.map((identifier) => {
        const url = identifier.getUrl()
        const icon = (
          <Box
            component='span'
            data-testid={
              identifier.validated ? 'member-identifier-validated' : undefined
            }
            sx={{
              display: 'inline-flex',
              p: '2px',
              borderRadius: '50%',
              border: '2px solid',
              borderColor: identifier.validated
                ? 'success.main'
                : 'transparent',
            }}
          >
            <Image
              src={identifier.getIcon()}
              alt={identifier.getLabel()}
              width={18}
              height={18}
            />
          </Box>
        )
        const title = `${identifier.getLabel()} : ${identifier.value}`
        return (
          <Tooltip
            key={`${identifier.type}-${identifier.value}`}
            title={
              identifier.validated
                ? `${title} (${t`identifier_validated_tooltip`})`
                : title
            }
          >
            {url ? (
              <MuiLink
                href={url}
                target='_blank'
                rel='noopener noreferrer'
                sx={{ display: 'inline-flex' }}
              >
                {icon}
              </MuiLink>
            ) : (
              <Box sx={{ display: 'inline-flex' }}>{icon}</Box>
            )}
          </Tooltip>
        )
      })}
    </Box>
  )
}

/**
 * Paginated members table of the detail panel: Employment rows for
 * institutions, direct Membership rows otherwise. Pagination, multi-column
 * sorting, name search and filters are server-side
 * (/api/organizations/[uid]/members).
 */
const StructureMembersTable = ({ structureUid }: { structureUid: string }) => {
  const lang = Lingui.i18n.locale as ExtendedLanguageCode
  const theme = useTheme()
  const router = useRouter()
  const { members, fetchStructureMembers } = useStore(
    (state) => state.organization,
  )

  const [pagination, setPagination] = useState<MRT_PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [sorting, setSorting] = useState<MRT_SortingState>(DEFAULT_SORTING)
  const [globalFilter, setGlobalFilter] = useState('')
  const [present, setPresent] = useState(true)
  const [notValidatedOnly, setNotValidatedOnly] = useState(false)
  const [columnSizing, setColumnSizing] = useState<MRT_ColumnSizingState>({})
  // Columns follow the container width until the user resizes one
  const userResized = useRef(false)

  // The profile validation status is only disclosed to wide-scoped account
  // editors (UX only, the server applies the same rule per member)
  const { data: session } = useSession()
  const canFilterByValidation = hasWiderThanSelfPersonScope(
    session?.user?.authz ?? EMPTY_PRINCIPAL,
    'update',
    'Person',
    'identifiers',
  )

  useEffect(() => {
    fetchStructureMembers({
      uid: structureUid,
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      present,
      search: globalFilter ?? '',
      sort: sorting.map(({ id, desc }) => ({ id, desc })),
      validation:
        canFilterByValidation && notValidatedOnly ? 'not_validated' : 'all',
    }).catch((error) => {
      console.error('Error fetching the structure members:', error)
    })
  }, [
    fetchStructureMembers,
    structureUid,
    pagination,
    sorting,
    globalFilter,
    present,
    notValidatedOnly,
    canFilterByValidation,
  ])

  const columns = useMemo<MRT_ColumnDef<StructureMemberJson>[]>(
    () => [
      alphabeticalSortColumn<StructureMemberJson>({
        id: 'name',
        accessorKey: 'displayName',
        header: t`research_structures_members_column_name`,
        size: 220,
        grow: 2,
        Cell({ row }) {
          const member = row.original
          const name = !member.slug ? (
            <CellText>{member.displayName}</CellText>
          ) : (
            <Typography
              variant='body2'
              noWrap
              color='primary'
              sx={{
                cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' },
              }}
              onClick={() =>
                router.push(`/${lang}/dashboard?perspective=${member.slug}`)
              }
            >
              {member.displayName}
            </Typography>
          )
          if (!member.profileValidated) return name
          return (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                minWidth: 0,
              }}
            >
              {name}
              <ProfileValidatedBadge fontSize='small' />
            </Box>
          )
        },
      }),
      alphabeticalSortColumn<StructureMemberJson>({
        id: 'position',
        accessorKey: 'position',
        header: t`research_structures_members_column_position`,
        size: 160,
        grow: 1,
        Cell({ row }) {
          return <CellText>{row.original.position ?? '—'}</CellText>
        },
      }),
      sortPriorityColumn<StructureMemberJson>({
        id: 'startDate',
        accessorKey: 'startDate',
        header: t`research_structures_members_column_arrival`,
        size: 110,
        Cell({ row }) {
          return <CellText>{formatDate(row.original.startDate, lang)}</CellText>
        },
      }),
      sortPriorityColumn<StructureMemberJson>({
        id: 'endDate',
        accessorKey: 'endDate',
        header: t`research_structures_members_column_departure`,
        size: 110,
        Cell({ row }) {
          return <CellText>{formatDate(row.original.endDate, lang)}</CellText>
        },
      }),
      sortPriorityColumn<StructureMemberJson>({
        id: 'publicationsCount',
        accessorKey: 'publicationsCount',
        header: t`research_structures_column_publications`,
        size: 110,
        muiTableHeadCellProps: { align: 'right' },
        muiTableBodyCellProps: { align: 'right' },
        Cell({ row }) {
          const member = row.original
          if (member.publicationsCount === 0) {
            return <Typography variant='body2'>—</Typography>
          }
          if (!member.slug) {
            return (
              <Typography variant='body2' fontWeight='bold'>
                {member.publicationsCount.toLocaleString(lang)}
              </Typography>
            )
          }
          return (
            <Tooltip
              title={t`research_structures_members_publications_tooltip`}
            >
              <Typography
                variant='body2'
                fontWeight='bold'
                color='primary'
                sx={{
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline' },
                }}
                onClick={() =>
                  router.push(`/${lang}/documents?perspective=${member.slug}`)
                }
              >
                {member.publicationsCount.toLocaleString(lang)}
              </Typography>
            </Tooltip>
          )
        },
      }),
      sortPriorityColumn<StructureMemberJson>({
        id: 'halRate',
        accessorKey: 'halRate',
        header: 'HAL',
        size: 110,
        Cell({ row }) {
          return (
            <RateBar
              value={row.original.halRate}
              color={theme.palette.primary.main}
            />
          )
        },
      }),
      sortPriorityColumn<StructureMemberJson>({
        id: 'oaRate',
        accessorKey: 'oaRate',
        header: 'OA',
        size: 110,
        Cell({ row }) {
          return (
            <RateBar
              value={row.original.oaRate}
              color={theme.palette.success.main}
            />
          )
        },
      }),
      {
        id: 'identifiers',
        header: t`research_structures_members_column_identifiers`,
        enableSorting: false,
        size: 150,
        Cell({ row }) {
          const member = row.original
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <MemberIdentifierIcons identifiers={member.identifiers} />
              {member.canEditAccount && member.slug && (
                <Tooltip title={t`edit_account_tooltip`}>
                  <IconButton
                    component={NextLink}
                    href={`/${lang}/account?perspective=${encodeURIComponent(member.slug)}`}
                    aria-label={t`edit_account_tooltip`}
                    size='small'
                    sx={{ p: 0.25 }}
                  >
                    <EditOutlinedIcon fontSize='small' />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )
        },
      },
    ],
    [lang, router, theme],
  )

  const table = useMaterialReactTable({
    columns,
    data: members.rows,
    manualPagination: true,
    manualSorting: true,
    enableMultiSort: true,
    // Every click adds, flips or removes that column's sort, keeping the others
    isMultiSortEvent: () => true,
    manualFiltering: true,
    rowCount: members.total,
    enableGlobalFilter: true,
    enableColumnFilters: false,
    enableColumnActions: false,
    layoutMode: 'grid',
    enableColumnResizing: true,
    defaultColumn: { minSize: MIN_COLUMN_SIZE },
    // Narrow columns cut their content instead of overflowing
    muiTableBodyCellProps: { sx: { overflow: 'hidden' } },
    onColumnSizingChange: (updater) => {
      userResized.current = true
      setColumnSizing(updater)
    },
    localization: Localization[lang],
    state: {
      columnSizing,
      pagination,
      sorting,
      globalFilter,
      isLoading: members.loading && members.rows.length === 0,
      showProgressBars: members.loading,
    },
    onPaginationChange: setPagination,
    onSortingChange: (updater) => {
      setSorting(updater)
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    },
    onGlobalFilterChange: (value: string | undefined) => {
      setGlobalFilter(value ?? '')
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    },
    muiSearchTextFieldProps: searchFieldProps(MAX_NAME_SEARCH_QUERY_LENGTH),
    muiPaginationProps: { rowsPerPageOptions: [10, 20, 50] },
    muiTablePaperProps: {
      variant: 'outlined',
      elevation: 0,
      sx: {
        // Hide the sort priority numbers MRT shows on multi-sorted headers
        '& thead .MuiBadge-badge': { display: 'none' },
        // Thin column resize separators, none after the last column
        '& .Mui-TableHeadCell-ResizeHandle-Divider': { borderWidth: '0.5px' },
        '& thead th:last-of-type .Mui-TableHeadCell-ResizeHandle-Wrapper': {
          display: 'none',
        },
      },
    },
    renderTopToolbarCustomActions: () => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 0.5 }}>
        <FormControlLabel
          control={
            <Switch
              size='small'
              checked={present}
              onChange={(_, checked) => {
                setPresent(checked)
                setPagination((prev) => ({ ...prev, pageIndex: 0 }))
              }}
            />
          }
          label={
            <Typography variant='body2'>
              {t`research_structures_members_switch_present`}
            </Typography>
          }
        />
        {canFilterByValidation && (
          <FormControlLabel
            control={
              <Switch
                size='small'
                checked={notValidatedOnly}
                onChange={(_, checked) => {
                  setNotValidatedOnly(checked)
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }))
                }}
              />
            }
            label={
              <Typography variant='body2'>
                {t`research_structures_members_switch_not_validated`}
              </Typography>
            }
          />
        )}
      </Box>
    ),
  })

  // Fit every column in the panel width, following its changes, until the
  // user resizes a column
  const { tableContainerRef } = table.refs
  useEffect(() => {
    const container = tableContainerRef.current
    if (!container) return
    const defaultSizes = columns.map((column) => ({
      id: column.id!,
      size: column.size ?? 150,
    }))
    const fit = () => {
      if (!userResized.current && container.clientWidth > 0) {
        setColumnSizing(fitColumnSizes(defaultSizes, container.clientWidth))
      }
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(container)
    return () => observer.disconnect()
  }, [tableContainerRef, columns])

  return <MaterialReactTable table={table} />
}

export default StructureMembersTable
