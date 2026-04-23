import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Typography,
} from '@mui/material'
import { t } from '@lingui/core/macro'
import { Close } from '@mui/icons-material'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import useStore from '@/stores/global_store'
import { Trans } from '@lingui/react'
import MergeDialogDocument from '@/app/[lang]/documents/components/MergeDialogDocument'
import { useTheme } from '@mui/system'

type MergeDialogProps = {
  open: boolean
  setOpen: (value: boolean) => void
  onMerge: (documentUids: string[]) => Promise<void>
  initialSelectedDocuments: string[]
}

const MergeDialog = ({
  open,
  setOpen,
  onMerge,
  initialSelectedDocuments,
}: MergeDialogProps) => {
  const theme = useTheme()
  const { documents = [] } = useStore((state) => state.document)
  const selectedDocsInitialization = useMemo(
    () =>
      Object.fromEntries(
        initialSelectedDocuments.map((uid) => [uid, true]),
      ) as Record<string, boolean>,
    [initialSelectedDocuments],
  )
  const [selectedDocs, setSelectedDocs] = useState<Record<string, boolean>>({})
  const initialDocsData = useMemo(
    () =>
      documents.filter((document) =>
        initialSelectedDocuments.includes(document.uid),
      ),
    [initialSelectedDocuments, documents],
  )
  const toggleSelection = useCallback(
    (uid: string) =>
      setSelectedDocs((prev) => ({ ...prev, [uid]: !prev[uid] })),
    [],
  )
  const [nbDocs, setNbDocs] = useState<number>(initialSelectedDocuments.length)
  const [checkAll, setCheckAll] = useState<boolean>(true)

  useEffect(() => {
    setSelectedDocs(selectedDocsInitialization)
    setNbDocs(initialSelectedDocuments.length)
  }, [selectedDocsInitialization, initialSelectedDocuments])

  useEffect(() => {
    const selection = Object.entries(selectedDocs).filter((doc) => doc[1])
    const nbSelected = selection.length
    const all = nbSelected == initialSelectedDocuments.length
    setCheckAll(all)
    setNbDocs(nbSelected)
  }, [selectedDocs, initialSelectedDocuments])

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      slotProps={{
        paper: {
          sx: {
            maxWidth: '750px',
          },
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginRight: '1rem',
        }}
      >
        <DialogTitle
          sx={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: theme.palette.primary.main,
          }}
        >{t`documents_merge_dialog_box_title`}</DialogTitle>
        <IconButton onClick={() => setOpen(false)}>
          <Close />
        </IconButton>
      </Box>
      <DialogContent
        dividers
        sx={{
          gap: '12px',
          display: 'flex',
          flexDirection: 'column',
          borderBottom: '0',
        }}
      >
        <Box
          sx={{ display: 'flex', justifyContent: 'space-between', gap: '15px' }}
        >
          <Alert
            severity='info'
            sx={{ flex: 5, fontSize: '14px' }}
          >{t`documents_merge_dialog_box_info_alert`}</Alert>
          <FormControlLabel
            control={
              <Checkbox
                checked={checkAll}
                onChange={(event) => {
                  if (event.target.checked) {
                    setSelectedDocs(selectedDocsInitialization)
                  } else {
                    setCheckAll(false)
                  }
                }}
              />
            }
            label={
              <Typography
                sx={{
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: theme.palette.primary.main,
                }}
              >{t`documents_merge_dialog_box_check_all_label`}</Typography>
            }
            sx={{ flex: 2, margin: 0 }}
          />
        </Box>
        {initialDocsData.map((document) => (
          <MergeDialogDocument
            key={document.uid}
            document={document}
            checked={selectedDocs[document.uid]}
            toggleSelection={toggleSelection}
          />
        ))}
      </DialogContent>
      <DialogActions sx={{ marginBottom: '12px', paddingRight: '20px' }}>
        <Button
          variant={'outlined'}
          onClick={() => setOpen(false)}
        >{t`documents_merge_dialog_box_cancel_button`}</Button>
        <Button
          variant={'contained'}
          onClick={async () => {
            const docs = Object.entries(selectedDocs).reduce(
              (acc: string[], doc) => {
                if (doc[1]) {
                  acc.push(doc[0])
                }
                return acc
              },
              [],
            )
            await onMerge(docs)
          }}
        >
          <Trans
            id={'documents_merge_dialog_box_merge_button'}
            values={{ nbDocs }}
          />
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default MergeDialog
