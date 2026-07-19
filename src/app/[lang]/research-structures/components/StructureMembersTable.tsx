'use client'

import { t } from '@lingui/core/macro'
import * as Lingui from '@lingui/core'
import {
  Box,
  FormControlLabel,
  Link as MuiLink,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
  MaterialReactTable,
  MRT_ColumnDef,
  MRT_PaginationState,
  MRT_SortingState,
  useMaterialReactTable,
} from 'material-react-table'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import useStore from '@/stores/global_store'
import { Localization } from '@/types/Localization'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { StructureMemberJson } from '@/types/StructureMember'
import RateBar from './RateBar'

const IDENTIFIER_DISPLAY_ORDER: PersonIdentifierType[] = [
  PersonIdentifierType.orcid,
  PersonIdentifierType.idref,
  PersonIdentifierType.idhals,
  PersonIdentifierType.idhali,
]

const formatDate = (value: string | null, locale: string): string =>
  value ? new Date(value).toLocaleDateString(locale) : '—'

const MemberIdentifierIcons = ({
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
          <Image
            src={identifier.getIcon()}
            alt={identifier.getLabel()}
            width={18}
            height={18}
          />
        )
        return (
          <Tooltip
            key={`${identifier.type}-${identifier.value}`}
            title={`${identifier.getLabel()} : ${identifier.value}`}
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
 * institutions, direct Membership rows otherwise. Pagination, sorting and
 * name search are server-side (/api/organizations/[uid]/members).
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
  const [sorting, setSorting] = useState<MRT_SortingState>([
    { id: 'name', desc: false },
  ])
  const [globalFilter, setGlobalFilter] = useState('')
  const [present, setPresent] = useState(true)

  useEffect(() => {
    fetchStructureMembers({
      uid: structureUid,
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      present,
      search: globalFilter ?? '',
      sortBy: sorting[0]?.id ?? 'name',
      sortDesc: sorting[0]?.desc ?? false,
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
  ])

  const columns = useMemo<MRT_ColumnDef<StructureMemberJson>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'displayName',
        header: t`research_structures_members_column_name`,
        size: 220,
        grow: 2,
        Cell({ row }) {
          const member = row.original
          if (!member.slug) {
            return <Typography variant='body2'>{member.displayName}</Typography>
          }
          return (
            <Typography
              variant='body2'
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
        },
      },
      {
        id: 'startDate',
        accessorKey: 'startDate',
        header: t`research_structures_members_column_arrival`,
        size: 110,
        Cell({ row }) {
          return (
            <Typography variant='body2'>
              {formatDate(row.original.startDate, lang)}
            </Typography>
          )
        },
      },
      {
        id: 'endDate',
        accessorKey: 'endDate',
        header: t`research_structures_members_column_departure`,
        size: 110,
        Cell({ row }) {
          return (
            <Typography variant='body2'>
              {formatDate(row.original.endDate, lang)}
            </Typography>
          )
        },
      },
      {
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
      },
      {
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
      },
      {
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
      },
      {
        id: 'identifiers',
        header: t`research_structures_members_column_identifiers`,
        enableSorting: false,
        size: 130,
        Cell({ row }) {
          return (
            <MemberIdentifierIcons identifiers={row.original.identifiers} />
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
    manualFiltering: true,
    rowCount: members.total,
    enableGlobalFilter: true,
    enableColumnFilters: false,
    enableColumnActions: false,
    layoutMode: 'grid',
    localization: Localization[lang],
    state: {
      pagination,
      sorting,
      globalFilter,
      isLoading: members.loading && members.rows.length === 0,
      showProgressBars: members.loading,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onGlobalFilterChange: (value: string | undefined) => {
      setGlobalFilter(value ?? '')
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    },
    muiPaginationProps: { rowsPerPageOptions: [10, 20, 50] },
    muiTablePaperProps: { variant: 'outlined', elevation: 0 },
    renderTopToolbarCustomActions: () => (
      <FormControlLabel
        sx={{ ml: 0.5 }}
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
    ),
  })

  return <MaterialReactTable table={table} />
}

export default StructureMembersTable
