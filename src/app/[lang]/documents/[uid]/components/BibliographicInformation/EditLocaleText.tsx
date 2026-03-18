import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  ClickAwayListener,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Popper,
  TextField,
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
import { Add, Check, Close } from '@mui/icons-material'
import { Trans } from '@lingui/react/macro'
import { Trans as TransNode } from '@lingui/react'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import ISO6391, { LanguageCode } from 'iso-639-1'
import { Literal } from '@/types/Literal'
import { useTheme } from '@mui/system'
import { t } from '@lingui/core/macro'
import { getRuntimeEnv } from '@/utils/runtimeEnv'

const EditLocaleText = ({
  field,
  callback,
  setAlert,
}: {
  field: DocumentField
  callback: () => void
  setAlert: ({
    open,
    success,
    message,
  }: {
    open: boolean
    success: boolean
    message: React.ReactNode
  }) => void
}) => {
  const theme = useTheme()
  const { selectedDocument } = useStore((state) => state.document)
  const modifyTitles = useStore((state) => state.document.modifyTitles)
  const modifyAbstracts = useStore((state) => state.document.modifyAbstracts)
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
  const appLanguages = getRuntimeEnv().NEXT_PUBLIC_SUPPORTED_LOCALES
  const supportedLanguageCodes = ISO6391.getAllCodes()
  const remainingLanguages = useMemo(
    () =>
      supportedLanguageCodes.filter(
        (code) => !values.find((l) => l.language == code),
      ),
    [supportedLanguageCodes, values],
  )
  const sortedLanguages = useMemo(() => {
    const preferred: LanguageCode[] = []
    const other: LanguageCode[] = []
    remainingLanguages.map((lang) =>
      appLanguages.includes(lang) ? preferred.push(lang) : other.push(lang),
    )
    return preferred.concat(other)
  }, [remainingLanguages, appLanguages])
  const [error, setError] = useState<string | null>(null)
  const [openDialog, setOpenDialog] = useState<boolean>(false)
  const sendData = async () => {
    const valid = values
      .filter((l) => !(l.value == ''))
      .map((l) => {
        l.value = l.value.trim()
        return l
      })
    setError(null)
    if (valid.length > 0) {
      let response
      switch (field.value) {
        case 'titles':
          response = await modifyTitles(valid)
          break
        case 'abstracts':
          response = await modifyAbstracts(valid)
          break
      }
      if (response?.success) {
        setAlert({
          open: true,
          success: true,
          message: (
            <TransNode
              id='bibliographic_information_update_success'
              values={{ field: field.value as DocumentLocalizableFieldKey }}
            />
          ),
        })
        callback()
      } else {
        setAlert({
          open: true,
          success: false,
          message: (
            <TransNode
              id='bibliographic_information_update_failure'
              values={{ field: field.value as DocumentLocalizableFieldKey }}
            />
          ),
        })
      }
    } else {
      setAlert({
        open: true,
        success: true,
        message: (
          <TransNode
            id='bibliographic_information_update_success'
            values={{ field: field.value as DocumentLocalizableFieldKey }}
          />
        ),
      })
      callback()
    }
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
          <Popper
            open={!!openLanguageMenu}
            anchorEl={openLanguageMenu}
            modifiers={[
              {
                name: 'offset',
                options: {
                  offset: [0, 4],
                },
              },
            ]}
            placement={'bottom-start'}
          >
            <ClickAwayListener onClickAway={() => setOpenLanguageMenu(null)}>
              <Paper sx={{ overflow: 'hidden', width: '300px' }}>
                <Autocomplete
                  disablePortal
                  fullWidth
                  getOptionLabel={(option) => ISO6391.getName(option)}
                  groupBy={(option) =>
                    appLanguages.includes(option)
                      ? 'Preferred'
                      : 'Other languages'
                  }
                  open
                  options={sortedLanguages}
                  popupIcon={null}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder={t`edit_field_languages_menu_header`}
                      slotProps={{
                        input: {
                          ...params.InputProps,
                          endAdornment: (
                            <IconButton
                              onClick={() => setOpenLanguageMenu(null)}
                              sx={{ marginRight: '5px' }}
                            >
                              <Close />
                            </IconButton>
                          ),
                        },
                      }}
                      sx={{
                        border: 'none',
                        width: '100%',
                        '& .MuiAutocomplete-inputRoot': {
                          paddingRight: '0 !important',
                        },
                      }}
                    />
                  )}
                  renderGroup={(params) => (
                    <Box
                      key={params.key}
                      sx={{ display: 'flex', flexDirection: 'column' }}
                    >
                      <Box
                        sx={{
                          backgroundColor: theme.palette.inverseOnSurface,
                          padding: '8px 0 8px 0',
                        }}
                      >
                        <Typography
                          sx={{
                            marginLeft: '15px',
                            fontWeight: 'bold',
                            color: theme.palette.outline,
                          }}
                        >
                          {params.group}
                        </Typography>
                      </Box>
                      <Box sx={{ padding: '5px 0 6px 0' }}>
                        {params.children}
                      </Box>
                    </Box>
                  )}
                  renderOption={(props, option) => {
                    const language = ISO6391.getName(option)
                    const languageCode = ISO6391.getCode(language)
                    return (
                      <MenuItem
                        key={option}
                        sx={{ display: 'flex', gap: 2 }}
                        onClick={() => {
                          if (languageCode == '') {
                            console.error('Unknown code language : ' + option)
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
                          {option}
                        </Avatar>
                        <Typography>{language}</Typography>
                      </MenuItem>
                    )
                  }}
                  slotProps={{
                    paper: {
                      sx: {
                        overflow: 'hidden',
                      },
                    },
                    listbox: {
                      sx: {
                        pt: '1px',
                      },
                    },
                  }}
                />
              </Paper>
            </ClickAwayListener>
          </Popper>
        )}
        <Typography color={'error'}>{error}</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant={'outlined'} onClick={cancel}>
            <Trans>edit_field_cancel_button_label</Trans>
          </Button>
          <Button
            variant={'contained'}
            disableElevation
            startIcon={<Check />}
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
            <Button
              onClick={() => {
                setOpenDialog(false)
                sendData()
              }}
            >
              <Trans>edit_field_continue_button_label</Trans>
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  )
}

export default EditLocaleText
