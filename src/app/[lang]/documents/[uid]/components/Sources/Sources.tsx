import { t } from '@lingui/core/macro'
import { CustomCard } from '@/components/Card'
import { LanguageChips } from '@/components/LanguageChips'
import useStore from '@/stores/global_store'
import {
  BibliographicPlatform,
  BibliographicPlatformMetadata,
} from '@/types/BibliographicPlatform'
import { DocumentType } from '@/types/Document'
import { DocumentRecord } from '@/types/DocumentRecord'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { getLocalizedValue } from '@/utils/getLocalizedValue'
import * as Lingui from '@lingui/core'
import { Trans, useLingui } from '@lingui/react'
import DeleteIcon from '@mui/icons-material/Delete'
import {
  Box,
  CardContent,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { MRT_ColumnDef, MRT_Row } from 'material-react-table'
import Image from 'next/image'
import React, { ReactNode, useMemo, useState } from 'react'
import { DocumentTypeIcons } from '../../../components/DocumentTypeIcons'
import { DocumentTypeLabels } from '../../../components/DocumentTypeLabels'

import CallMergeIcon from '@mui/icons-material/CallMerge'
import { Localization } from '@/types/Localization'
import { LocRelator } from '@/types/LocRelator'
import dayjs from 'dayjs'
import { LocaleDateFormats } from '@/types/LocaleDateFormats'
import { DocumentTypeService } from '@/lib/services/DocumentTypeService'
import { DocumentTable } from '@/app/[lang]/documents/components/DocumentTable'
import { PermissionAction } from '@/types/Permission'
import { useSession } from 'next-auth/react'
import { abilityFromAuthzContext } from '@/app/auth/ability'

function Sources() {
  const { _ } = useLingui()
  const [action, setAction] = useState<string>('')
  const { data: session } = useSession()
  const lang = Lingui.i18n.locale as ExtendedLanguageCode
  const { selectedDocument = null } = useStore((state) => state.document)
  const [selectedTitleLangs, setSelectedTitleLangs] = useState<
    Record<string, string>
  >({})
  const supportedLocales = process.env.NEXT_PUBLIC_SUPPORTED_LOCALES?.split(',')
  const theme = useTheme()
  const ability = useMemo(
    () => abilityFromAuthzContext(session?.user.authz),
    [session?.user?.authz],
  )
  const [data, setData] = useState<DocumentRecord[]>(
    selectedDocument?.records || [],
  )

  const getPreciseType = (types: DocumentType[]) => {
    const clearDocumentTypes = types.filter(
      (type) =>
        type.toString() != 'Unknown' &&
        DocumentTypeService.isDocumentType(type),
    )
    if (clearDocumentTypes.length == 0) {
      return DocumentType.Document
    }
    const typeHierarchy = DocumentTypeService.toMenuTree()
    let preciseTypeIndex: number = 0
    for (const [index, type] of typeHierarchy.entries()) {
      if (clearDocumentTypes.includes(type.value)) {
        if (type.depth > preciseTypeIndex) {
          preciseTypeIndex = index
        }
      }
    }
    return typeHierarchy[preciseTypeIndex].value
  }

  const columns = useMemo<
    MRT_ColumnDef<DocumentRecord>[]
  >((): MRT_ColumnDef<DocumentRecord>[] => {
    const typeOptions = DocumentTypeService.toMenuTree()
      .filter((n) => n.value !== DocumentType.Document)
      .map(({ value, depth }) => {
        const plainLabel = _(DocumentTypeLabels[value])
        return {
          value,
          label: (
            <Box
              className='doc-type-option'
              sx={{ display: 'flex', alignItems: 'center', pl: depth * 1.5 }}
            >
              <Box sx={{ mr: 1 }}>{DocumentTypeIcons[value]}</Box>
              <Typography variant='body2' noWrap>
                {plainLabel}
              </Typography>
            </Box>
          ),
          plainLabel,
        }
      })
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
          const type = getPreciseType(row.original.documentTypes)
          return (
            <Tooltip title={_(DocumentTypeLabels[type])}>
              {DocumentTypeIcons[type]}
            </Tooltip>
          )
        },
        filterFn: (row, id, value) => {
          if (!value || value.length === 0) return true
          const type = getPreciseType(row.original.documentTypes)
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
        }: {
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
              <Typography>{localizedTitle.value}</Typography>
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
          return (
            <Typography>
              {!dateStr
                ? t`documents_page_publication_date_column_no_date_available`
                : dateStr}
            </Typography>
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
  }, [lang, selectedTitleLangs, supportedLocales, _])

  const handleChange = () => {
    setAction('')
  }

  const onUnmergeDocument = async (documentRecordUids: string[]) => {
    if (documentRecordUids.length < 1) return
  }

  const onInvalidateDocument = async (documentRecordUids: string[]) => {
    if (documentRecordUids.length < 1) return
  }

  return (
    <CustomCard
      header={
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography
            sx={{
              color: theme.palette.primary.main,
              fontSize: theme.utils.pxToRem(20),
              fontStyle: 'normal',
              fontWeight: theme.typography.fontWeightRegular,
              lineHeight: 'normal',
            }}
          >
            <Trans id='document_details_page_source_tab_card_title' />
          </Typography>
        </Box>
      }
    >
      <CardContent>
        <DocumentTable<DocumentRecord>
          columns={columns}
          data={data}
          enableRowSelection={(row) => {
            return ability.can(PermissionAction.unmerge, row.original)
          }}
          localization={Localization[lang]}
          positionToolbarAlertBanner={'bottom'}
          renderTopToolbarCustomActions={({ table }) => {
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
                    onChange={handleChange}
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
          }}
          rowCount={data.length}
        />
      </CardContent>
    </CustomCard>
  )
}

export default Sources
