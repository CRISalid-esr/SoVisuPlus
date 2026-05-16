import * as Lingui from '@lingui/core'
import { SourceRecordType } from '@prisma/client'
import { SourceRecordTypeLabels } from '@/app/[lang]/documents/components/SourceRecordTypeLabels'
import {
  Box,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from '@mui/material'
import { SourceRecordTypeIcons } from '@/app/[lang]/documents/components/SourceRecordTypeIcons'
import React, { ReactNode, useMemo, useState } from 'react'
import { Trans, useLingui } from '@lingui/react'
import {
  MRT_Cell,
  MRT_Column,
  MRT_ColumnDef,
  MRT_Row,
  MRT_TableOptions,
} from 'material-react-table'
import { DocumentRecord } from '@/types/DocumentRecord'
import { t } from '@lingui/core/macro'
import { SourceRecordTypeService } from '@/lib/services/SourceRecordTypeService'
import { getLocalizedValue } from '@/utils/getLocalizedValue'
import Highlighter from 'react-highlight-words'
import { LanguageChips } from '@/components/LanguageChips'
import { LocRelator } from '@/types/LocRelator'
import HighlighterWithEllipsis from '@/app/[lang]/documents/components/HighlighterWithEllipsis'
import { LocaleDateFormats } from '@/types/LocaleDateFormats'
import dayjs from 'dayjs'
import {
  BibliographicPlatform,
  BibliographicPlatformMetadata,
} from '@/types/BibliographicPlatform'
import Image from 'next/image'
import { PermissionAction } from '@/types/Permission'
import DeleteIcon from '@mui/icons-material/Delete'
import CallMergeIcon from '@mui/icons-material/CallMerge'
import { useDocumentTable } from '@/app/[lang]/documents/hooks/documentTable/useDocumentTable'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { readInitialGlobalFilter } from '@/app/[lang]/documents/hooks/documentTable/utils/persistence'
import useStore from '@/stores/global_store'
import { useSession } from 'next-auth/react'
import { abilityFromAuthzContext } from '@/app/auth/ability'

const createSourceTypeTree = (
  _: (descriptor: Lingui.MessageDescriptor) => string,
) =>
  Object.values(SourceRecordType).map((type) => {
    const plainLabel = _(SourceRecordTypeLabels[type])
    return {
      value: type,
      label: (
        <Box
          className='doc-type-option'
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          <Box sx={{ mr: 1 }}>{SourceRecordTypeIcons[type]}</Box>
          <Typography variant='body2' noWrap>
            {plainLabel}
          </Typography>
        </Box>
      ),
      plainLabel,
    }
  })

const onUnmergeDocument = async (documentRecordUids: string[]) => {
  if (documentRecordUids.length < 1) return
}

const onInvalidateDocument = async (documentRecordUids: string[]) => {
  if (documentRecordUids.length < 1) return
}

export const useSourcesTable = () => {
  const { _ } = useLingui()
  const { data: session } = useSession()
  const ability = useMemo(
    () => abilityFromAuthzContext(session?.user.authz),
    [session?.user?.authz],
  )
  const lang = Lingui.i18n.locale as ExtendedLanguageCode
  const supportedLocales = process.env.NEXT_PUBLIC_SUPPORTED_LOCALES?.split(',')
  const [selectedTitleLangs, setSelectedTitleLangs] = useState<
    Record<string, string>
  >({})
  const [action, setAction] = useState<string>('')
  const [globalFilter, setGlobalFilter] = useState(readInitialGlobalFilter)
  const { selectedDocument = null } = useStore((state) => state.document)
  const [data] = useState<DocumentRecord[]>(selectedDocument?.records || [])
  const typeOptions = useMemo(() => createSourceTypeTree(_), [_])
  const columns = useMemo<
    MRT_ColumnDef<DocumentRecord>[]
  >((): MRT_ColumnDef<DocumentRecord>[] => {
    return [
      {
        enableSorting: false,
        accessorKey: 'type',
        header: t`documents_page_type_column`,
        filterVariant: 'multi-select',
        filterColumn: 'type',
        //@ts-expect-error:  overide filterSelectOptions to accept Element.jsx instead of Element
        filterSelectOptions: typeOptions,
        Cell({
          row,
        }: {
          row: MRT_Row<DocumentRecord>
          renderedCellValue: ReactNode
        }) {
          const type = SourceRecordTypeService.getPreciseType(
            row.original.documentTypes,
          )
          return (
            <Tooltip title={_(SourceRecordTypeLabels[type])}>
              {SourceRecordTypeIcons[type]}
            </Tooltip>
          )
        },
        filterFn: (row, id, value) => {
          if (!value || value.length === 0) return true
          const type = SourceRecordTypeService.getPreciseType(
            row.original.documentTypes,
          )
          return value.includes(type)
        },
      },
      {
        size: 200,
        accessorKey: `titles`,
        accessorFn: (row) => {
          const { titles, uid } = row
          const preferredRowLang = selectedTitleLangs[uid] || lang
          const localizedTitle = getLocalizedValue(
            titles,
            preferredRowLang,
            supportedLocales,
            t`no_title_available`,
          )
          return localizedTitle.value
        },
        enableFilterMatchHighlighting: true,
        header: t`documents_page_title_column`,
        Cell({
          row,
          column,
        }: {
          column: MRT_Column<DocumentRecord>
          row: MRT_Row<DocumentRecord>
          renderedCellValue: ReactNode
        }) {
          const { titles, uid } = row.original
          const preferredRowLang = selectedTitleLangs[uid] || lang
          const localizedTitle = getLocalizedValue(
            titles,
            preferredRowLang,
            supportedLocales,
            t`no_title_available`,
          )
          const effectiveRowLang = localizedTitle.language
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Highlighter
                highlightClassName='highlight'
                searchWords={[globalFilter, column.getFilterValue() as string]}
                autoEscape
                textToHighlight={localizedTitle.value}
              />
              <LanguageChips
                texts={titles}
                selectedLang={effectiveRowLang}
                onLanguageSelect={(newLang) =>
                  setSelectedTitleLangs((prev) => ({ ...prev, [uid]: newLang }))
                }
              />
            </Box>
          )
        },
      },
      {
        accessorKey: 'contributions',
        accessorFn: (row) => {
          return row.contributions
            .map((contribution) =>
              contribution.role == LocRelator.AUTHOR
                ? contribution.person.name
                : '',
            )
            .sort()
            .join(', ')
        },
        header: t`documents_page_contributors_column`,
        Cell({
          cell,
          column,
        }: {
          cell: MRT_Cell<DocumentRecord>
          column: MRT_Column<DocumentRecord>
        }) {
          return (
            <HighlighterWithEllipsis
              searchWords={[globalFilter, column.getFilterValue() as string]}
              text={cell.getValue<string>()}
            />
          )
        },
      },
      {
        size: 100,
        accessorKey: 'date',
        header: t`documents_page_publication_date_column`,
        filterVariant: 'date-range',
        Cell({
          row,
        }: {
          row: { original: DocumentRecord }
          renderedCellValue: ReactNode
        }) {
          const date = row.original.publicationDate
          const dateFormat = LocaleDateFormats[lang] || 'MM-DD-YYYY'
          const dateJs = dayjs(date)
          let dateStr = date?.toString()
          if (dateJs.isValid()) {
            dateStr = dateJs.format(dateFormat)
          }
          return !dateStr ? (
            t`documents_page_publication_date_column_no_date_available`
          ) : (
            <Highlighter
              highlightClassName='highlight'
              searchWords={[globalFilter]}
              autoEscape
              textToHighlight={dateStr}
            />
          )
        },
        filterFn: (row, id, value) => {
          const [startDate, endDate] = (value as (string | null)[]) ?? []
          if (!startDate && !endDate) return true
          const rowDate = dayjs(row.original.publicationDate)
          if (!rowDate.isValid()) return false
          const rowDay = rowDate.startOf('day')
          if (startDate) {
            const startDay = dayjs(startDate).startOf('day')
            if (rowDay.isBefore(startDay)) return false
          }
          if (endDate) {
            const endDay = dayjs(endDate).endOf('day')
            if (rowDay.isAfter(endDay)) return false
          }
          return true
        },
        muiTableHeadCellProps: {
          sx: { '& .MuiBox-root': { gridTemplateColumns: '1fr' } },
        },
      },
      {
        accessorKey: 'publishedIn',
        accessorFn: (row) => {
          if (row.journal) {
            let str = row.journal?.titles[0]
            if (row.journal?.publisher) {
              str += ' (' + row.journal?.publisher + ')'
            }
            return str
          }
        },
        header: t`documents_page_publishedIn_column`,
        Cell({ cell, column }) {
          const title = cell.getValue<string>()
          return (
            title && (
              <Highlighter
                highlightClassName='highlight'
                searchWords={[globalFilter, column.getFilterValue() as string]}
                autoEscape
                textToHighlight={title}
              />
            )
          )
        },
      },
      {
        enableSorting: false,
        accessorKey: 'source',
        header: t`documents_page_source_column`,
        Cell({ row }: { row: { original: DocumentRecord } }) {
          const platform = row.original.platform
          const metadata = BibliographicPlatformMetadata[platform]
          const imageElement = (
            <Image
              src={metadata?.icon || '/icons/default.png'}
              alt={metadata?.name || 'Unknown Source'}
              width={24}
              height={24}
              priority
              title={metadata?.name || 'Unknown Source'} // Tooltip on hover
            />
          )
          return (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              {row.original.url ? (
                <IconButton
                  key={row.original.platform}
                  component='a'
                  href={row.original.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  sx={{ padding: 0 }}
                >
                  {imageElement}
                </IconButton>
              ) : (
                <Box key={row.original.platform}>{imageElement}</Box>
              )}
            </Box>
          )
        },
        filterVariant: 'multi-select',
        filterColumn: 'source',
        //@ts-expect-error:  overide filterSelectOptions to accept Element.jsx instead of Element
        filterSelectOptions: Object.values(BibliographicPlatform).map(
          (platform) => {
            const metadata = BibliographicPlatformMetadata[platform]
            return {
              value: platform,
              label: (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                  }}
                >
                  <Typography>{metadata?.name || platform}</Typography>
                  <Image
                    src={metadata?.icon || '/icons/default.png'}
                    alt={metadata?.name || 'Unknown Source'}
                    width={24}
                    height={24}
                    priority
                  />
                </Box>
              ),
            }
          },
        ),
        filterFn: (row, id, value) => {
          if (!value || value.length === 0) return true
          return value.includes(row.original.platform)
        },
      },
    ]
  }, [typeOptions, _, selectedTitleLangs, lang, supportedLocales, globalFilter])

  const tableOptions: MRT_TableOptions<DocumentRecord> = useMemo(
    () => ({
      columns,
      data,
      enableRowSelection: (row) => {
        return ability.can(PermissionAction.unmerge, row.original)
      },
      positionToolbarAlertBanner: 'bottom',
      onGlobalFilterChange: setGlobalFilter,
      renderTopToolbarCustomActions: ({ table }) => {
        const rowSelected = table.getSelectedRowModel().rows.length > 0
        return (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <FormControl
              sx={{
                minWidth: 120,
                width: '100%',
              }}
            >
              <InputLabel id='demo-simple-select-autowidth-label'>
                {' '}
                <Trans id='document_details_page_source_tab_select_action_label' />
              </InputLabel>
              <Select
                labelId='demo-simple-select-autowidth-label'
                id='demo-simple-select-autowidth'
                value={action}
                onChange={() => {
                  setAction('')
                }}
                autoWidth
                label={
                  <Trans id='document_details_page_source_tab_select_action_label' />
                }
              >
                <MenuItem
                  value='pending'
                  disabled={!rowSelected}
                  onClick={async () => {
                    await onInvalidateDocument(
                      table
                        .getSelectedRowModel()
                        .rows.map((row) => row.original.uid),
                    )
                    table.resetRowSelection()
                  }}
                >
                  <Box display='flex' alignItems='center'>
                    <DeleteIcon />
                    <Trans id='document_details_page_source_tab_select_action_invalidate_label' />
                  </Box>{' '}
                </MenuItem>

                <MenuItem
                  value='rejected'
                  disabled={!rowSelected}
                  onClick={async () => {
                    await onUnmergeDocument(
                      table
                        .getSelectedRowModel()
                        .rows.map((row) => row.original.uid),
                    )
                    table.resetRowSelection()
                  }}
                >
                  <Box display='flex' alignItems='center'>
                    <CallMergeIcon />
                    <Trans id='document_details_page_source_tab_select_action_unmerge_label' />
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Box>
        )
      },
      rowCount: data.length,
      state: {
        globalFilter,
      },
    }),
    [ability, action, columns, data, globalFilter],
  )

  const table = useDocumentTable(tableOptions)
  return { table: table }
}
