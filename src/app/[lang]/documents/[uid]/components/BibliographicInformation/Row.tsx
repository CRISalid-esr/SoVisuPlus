import { Box, IconButton, TableCell, TableRow } from '@mui/material'
import * as Lingui from '@lingui/core'
import { useEffect, useState } from 'react'

import { getLocalizedValue } from '@/utils/getLocalizedValue'
import { LanguageChips } from '@/components/LanguageChips'
import useStore from '@/stores/global_store'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import RowLabel from './RowLabel'
import {
  DocumentField,
  DocumentLocalizableFieldKey,
} from './BibliographicInformation'
import EditIcon from '@mui/icons-material/Edit'
import styles from './Row.module.css'
import { useTheme } from '@mui/material/styles'
import EditLocaleText from '@/app/[lang]/documents/[uid]/components/BibliographicInformation/EditLocaleText'

const Row = ({ field }: { field: DocumentField }) => {
  const theme = useTheme()
  const lang = Lingui.i18n.locale as ExtendedLanguageCode
  const [selectedLang, setSelectedLang] = useState<string>(lang)
  const [content, setContent] = useState('')
  const [displayEdit, setDisplayEdit] = useState(false)
  const { selectedDocument } = useStore((state) => state.document)

  useEffect(() => {
    if (!field.hasLanguageSelector) {
      return
    }

    const supportedLocales =
      process.env.NEXT_PUBLIC_SUPPORTED_LOCALES?.split(',') || []

    const { language, value } = getLocalizedValue(
      selectedDocument?.[field.value as DocumentLocalizableFieldKey] ?? [],
      selectedLang,
      supportedLocales,
      field.noContentAvailableMessage || '',
    )

    if (language !== selectedLang) {
      setSelectedLang(language)
    }

    setContent(value)
  }, [
    selectedLang,
    selectedDocument,
    field.hasLanguageSelector,
    field.value,
    field.noContentAvailableMessage,
  ])

  const handleLanguageChange = (lang: string) => {
    setSelectedLang(lang)
  }

  return (
    <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
      <TableCell component='th' scope='row'>
        <Box sx={{ alignItems: 'center', display: 'flex', gap: '2rem' }}>
          <RowLabel>{field.title}</RowLabel>

          {field.hasLanguageSelector && !displayEdit && (
            <LanguageChips
              texts={
                selectedDocument?.[
                  field.value as DocumentLocalizableFieldKey
                ] ?? []
              }
              selectedLang={selectedLang}
              onLanguageSelect={handleLanguageChange}
              isInline
            />
          )}
        </Box>
      </TableCell>

      <TableCell
        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
        className={styles.cell}
      >
        {field.component && !displayEdit && (
          <field.component content={content}></field.component>
        )}
        {field.hasLanguageSelector && displayEdit ? (
          <EditLocaleText
            field={field}
            callback={() => setDisplayEdit(false)}
          />
        ) : (
          <IconButton
            className={styles.editButton}
            onClick={() => {
              setDisplayEdit(true)
            }}
          >
            <EditIcon />
          </IconButton>
        )}
      </TableCell>
    </TableRow>
  )
}
export default Row
