import { Box, Checkbox, Link, Paper, Typography } from '@mui/material'
import {
  BibliographicPlatform,
  BibliographicPlatformMetadata,
} from '@/types/BibliographicPlatform'
import Image from 'next/image'
import { SourceRecordTypeLabels } from '@/app/[lang]/documents/components/SourceRecordTypeLabels'
import { DocumentType, SourceRecordType } from '@prisma/client'
import { DocumentTypeLabels } from '@/app/[lang]/documents/components/DocumentTypeLabels'
import { t } from '@lingui/core/macro'
import React, { useCallback, useMemo, useState } from 'react'
import { getLocalizedValue } from '@/utils/getLocalizedValue'
import * as Lingui from '@lingui/core'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { Document } from '@/types/Document'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { LocaleDateFormats } from '@/types/LocaleDateFormats'
import { Contribution } from '@/types/Contribution'
import { SourceRecordTypeService } from '@/lib/services/SourceRecordTypeService'
import { useLingui } from '@lingui/react'
import { useTheme } from '@mui/system'

dayjs.extend(utc)

type MergeDialogDocumentProps = {
  document: Document
  checked: boolean
  toggleSelection: (uid: string) => void
}

const MergeDialogDocument = React.memo(
  ({ document, checked, toggleSelection }: MergeDialogDocumentProps) => {
    MergeDialogDocument.displayName = 'MergeDialogDocument'
    const handleChange = useCallback(
      () => toggleSelection(document.uid),
      [toggleSelection, document.uid],
    )
    const theme = useTheme()
    const lang = Lingui.i18n.locale as ExtendedLanguageCode
    const { _ } = useLingui()
    const supportedLocales =
      process.env.NEXT_PUBLIC_SUPPORTED_LOCALES?.split(',')
    const localizedTitle = getLocalizedValue(
      document.titles,
      lang,
      supportedLocales,
      t`no_title_available`,
    )
    let dateStr = document.publicationDate
    if (!dateStr) {
      dateStr = t`documents_page_publication_date_column_no_date_available`
    } else if (dayjs(dateStr, 'YYYY-MM-DD').isValid()) {
      const dateFormat = LocaleDateFormats[lang] || 'MM-DD-YYYY'
      dateStr = dayjs(dateStr, 'YYYY-MM-DD').format(dateFormat)
    }
    const contributors = useMemo(
      () =>
        document.contributions
          .map((contribution: Contribution) => {
            const person = contribution.person
            const { firstName, lastName } = person
            let name = [firstName, lastName].filter(Boolean).join(' ')
            if (name.match(/^\s*$/)) {
              name = person.getDisplayName()
            }
            return name
          })
          .filter(Boolean)
          .join(', '),
      [document.contributions],
    )
    const journal = document.journal?.title
    const info = dateStr + ' • ' + contributors

    const types = useMemo(() => {
      const types: Array<{
        platform: BibliographicPlatform | null
        value: DocumentType | SourceRecordType
      }> = [{ platform: null, value: document.documentType }]
      document.records.forEach((record) => {
        const type = SourceRecordTypeService.getPreciseType(
          record.documentTypes,
        )
        if (type) {
          types.push({ platform: record.platform, value: type })
        }
      })
      return types
    }, [document.documentType, document.records])

    return (
      <Paper
        elevation={1}
        sx={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px',
          backgroundColor: checked ? theme.palette.surface : 'inherit',
        }}
      >
        <Checkbox checked={checked} onChange={handleChange} />
        <Box
          sx={{ display: 'flex', flexDirection: 'column', padding: '0px 5px' }}
        >
          <Typography
            variant={'subtitle1'}
            sx={{
              fontSize: '13px',
              fontWeight: 'bold',
              color: theme.palette.primary.main,
            }}
          >
            {localizedTitle.value}
          </Typography>
          <Typography variant={'caption'}>
            {info}
            {journal && (
              <>
                {' • '}
                <Typography variant={'caption'} sx={{ fontStyle: 'italic' }}>
                  {journal}
                </Typography>
              </>
            )}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}
          >
            <Box sx={{ display: 'flex', gap: '10px' }}>
              {types.map((type) => {
                let imageElement = null
                if (type.platform) {
                  const metadata = BibliographicPlatformMetadata[type.platform]
                  imageElement = (
                    <Image
                      src={metadata?.icon || '/icons/default.png'}
                      alt={metadata?.name || 'Unknown Source'}
                      width={18}
                      height={18}
                      priority
                      title={metadata?.name || 'Unknown Source'} // Tooltip on hover
                    />
                  )
                }
                return (
                  <Paper
                    variant='outlined'
                    key={type.platform ?? 'default'}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '5px 5px',
                      gap: '6px',
                      backgroundColor: type.platform
                        ? 'inherit'
                        : theme.palette.lightSecondaryContainer,
                    }}
                  >
                    <Typography>
                      {type.platform
                        ? _(
                            SourceRecordTypeLabels[
                              type.value as SourceRecordType
                            ],
                          )
                        : _(DocumentTypeLabels[type.value as DocumentType])}
                    </Typography>
                    {imageElement}
                  </Paper>
                )
              })}
            </Box>
            <Link href={''}>{t`documents_merge_dialog_box_detail_link`}</Link>
          </Box>
        </Box>
      </Paper>
    )
  },
)

export default MergeDialogDocument
