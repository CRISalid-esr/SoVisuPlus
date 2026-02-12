import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material'
import useStore from '@/stores/global_store'
import {
  DocumentField,
  DocumentLocalizableFieldKey,
} from '@/app/[lang]/documents/[uid]/components/BibliographicInformation/BibliographicInformation'
import { useEffect, useMemo, useState } from 'react'
import EditLocaleField from '@/app/[lang]/documents/[uid]/components/BibliographicInformation/EditLocaleField'
import { CheckIcon, CloseIcon } from '@storybook/icons'
import { Add, Close } from '@mui/icons-material'
import { Trans } from '@lingui/react/macro'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import ISO6391, { LanguageCode } from 'iso-639-1'
import { getRuntimeEnv } from '@/utils/runtimeEnv'
import { LanguageChips } from '@/components/LanguageChips'
import { Literal } from '@/types/Literal'
import { useTheme } from '@mui/system'
import { t } from '@lingui/core/macro'

const EditLocaleText = ({
  field,
  callback,
}: {
  field: DocumentField
  callback: () => void
}) => {
  const theme = useTheme()
  const { selectedDocument } = useStore((state) => state.document)
  const texts = useMemo(
    () => selectedDocument?.[field.value as DocumentLocalizableFieldKey] ?? [],
    [selectedDocument, field],
  )
  const [values, setValues] = useState<Literal[]>(structuredClone(texts))
  const removeValue = (lang: ExtendedLanguageCode) => {
    setValues(values.filter((l) => l.language !== lang))
  }
  const addValue = (lang: LanguageCode) => {
    setValues(
      values.find((l) => l.language == lang)
        ? values
        : [...values, new Literal('', lang)],
    )
  }
  const [openLanguageMenu, setOpenLanguageMenu] = useState<null | HTMLElement>(
    null,
  )
  const supportedLanguageCodes =
    process.env.NEXT_PUBLIC_SUPPORTED_LOCALES.split(',')
  const remainingLanguages = useMemo(
    () =>
      supportedLanguageCodes.filter(
        (code) => !values.find((l) => l.language == code),
      ),
    [supportedLanguageCodes, values],
  )
  const [error, setError] = useState<string | null>(null)
  const [openDialog, setOpenDialog] = useState<boolean>(false)
  const sendData = () => {
    /**TODO**/
    setError(null)
    console.log('API call save')
    callback()
  }
  const cancel = () => {
    setValues(texts)
    callback()
  }
  const save = () => {
    if (values.length == 0) {
      setError(t`edit_field_no_values_save`)
    } else {
      const emptyValues = values.filter((l) => l.value == '')
      if (emptyValues.length == values.length) {
        setError(t`edit_field_only_empty_fields_saved`)
      } else {
        if (emptyValues.length > 0) {
          setOpenDialog(true)
        } else {
          sendData()
        }
      }
    }
  }
  useEffect(() => {
    if (remainingLanguages.length == 0) {
      setOpenLanguageMenu(null)
    }
  }, [remainingLanguages])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {values.map((l) => {
          return (
            <Box key={l.language} sx={{ display: 'flex', flex: 1 }}>
              <EditLocaleField literal={l} deleteLang={removeValue} />
            </Box>
          )
        })}
      </Box>
      <Divider />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', flex: 1 }}>
        <Tooltip
          disableHoverListener={remainingLanguages.length > 0}
          title={<Trans>edit_field_languages_menu_no_languages_message</Trans>}
        >
          <span>
            <Button
              disabled={remainingLanguages.length == 0}
              variant={'outlined'}
              startIcon={<Add />}
              onClick={(event) => {
                setOpenLanguageMenu(event.currentTarget)
              }}
            >
              <Trans>edit_field_add_language_button_label</Trans>
            </Button>
          </span>
        </Tooltip>
        {remainingLanguages.length > 0 && (
          <Menu
            open={!!openLanguageMenu}
            anchorEl={openLanguageMenu}
            anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'center' }}
            slotProps={{ paper: { sx: { overflow: 'hidden' } } }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '700px',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                }}
              >
                <Typography
                  variant={'h6'}
                  fontSize={'15px'}
                  sx={{ pl: '10px' }}
                >
                  <Trans>edit_field_languages_menu_header</Trans>
                </Typography>
                <IconButton onClick={() => setOpenLanguageMenu(null)}>
                  <Close />
                </IconButton>
              </Box>
              <Divider />
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflowY: 'auto',
                }}
              >
                {remainingLanguages.map((code) => {
                  const language = ISO6391.getNativeName(code)
                  const languageCode = ISO6391.getCode(language)
                  return (
                    <MenuItem
                      key={code}
                      sx={{ display: 'flex', gap: 2 }}
                      onClick={() => {
                        if (languageCode == '') {
                          console.error('Unknown code language : ' + code)
                        } else {
                          addValue(languageCode)
                          setOpenLanguageMenu(null)
                          setError(null)
                        }
                      }}
                    >
                      <Avatar
                        variant={'rounded'}
                        sx={{
                          width: '24px',
                          height: '24px',
                          fontSize: '14px',
                          backgroundColor: theme.palette.surfaceContainer,
                          color: theme.palette.primary.main,
                        }}
                      >
                        {code}
                      </Avatar>
                      <Typography>{language}</Typography>
                    </MenuItem>
                  )
                })}
              </Box>
            </Box>
          </Menu>
        )}
        <Typography color={'error'}>{error}</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant={'outlined'} onClick={cancel}>
            <Trans>edit_field_cancel_button_label</Trans>
          </Button>
          <Button
            variant={'contained'}
            disableElevation
            startIcon={<CheckIcon />}
            onClick={save}
          >
            <Trans>edit_field_save_button_label</Trans>
          </Button>
        </Box>
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
          <DialogTitle
            variant={'h6'}
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <Trans>edit_field_dialog_title</Trans>
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              <Trans>edit_field_dialog_text</Trans>
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>
              <Trans>edit_field_cancel_button_label</Trans>
            </Button>
            <Button onClick={sendData}>
              <Trans>edit_field_continue_button_label</Trans>
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  )
}

export default EditLocaleText
