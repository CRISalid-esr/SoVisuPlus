import { Box, Button, Typography } from '@mui/material'
import EditLocaleText from '@/app/[lang]/documents/[uid]/components/BibliographicInformation/EditLocaleText'
import EditIcon from '@mui/icons-material/Edit'
import { Dispatch, SetStateAction } from 'react'
import { DocumentField } from '@/app/[lang]/documents/[uid]/components/BibliographicInformation/BibliographicInformation'
import { Trans } from '@lingui/react/macro'

const Titles = ({
  content,
  field,
  edit,
  setEdit,
  setAlert,
}: {
  content: string
  field: DocumentField
  edit: boolean
  setEdit: Dispatch<SetStateAction<boolean>>
  setAlert: ({
    open,
    success,
    message,
  }: {
    open: boolean
    success: boolean
    message: React.ReactNode
  }) => void
}) =>
  !edit ? (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Typography>{content}</Typography>
      <Button
        variant='outlined'
        startIcon={<EditIcon />}
        onClick={() => setEdit(true)}
      >
        <Trans>document_details_page_titles_row_edit_button</Trans>
      </Button>
    </Box>
  ) : (
    <EditLocaleText
      field={field}
      callback={() => setEdit(false)}
      setAlert={setAlert}
    />
  )

export default Titles
