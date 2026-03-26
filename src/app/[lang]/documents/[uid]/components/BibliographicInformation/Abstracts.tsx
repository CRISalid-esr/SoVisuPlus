import { Box, Button, Typography } from '@mui/material'
import { DocumentField } from '@/app/[lang]/documents/[uid]/components/BibliographicInformation/BibliographicInformation'
import { Dispatch, SetStateAction, useMemo } from 'react'
import EditIcon from '@mui/icons-material/Edit'
import EditLocaleText from '@/app/[lang]/documents/[uid]/components/BibliographicInformation/EditLocaleText'
import { Trans } from '@lingui/react/macro'
import { useSession } from 'next-auth/react'
import { abilityFromAuthzContext } from '@/app/auth/ability'
import useStore from '@/stores/global_store'
import { PermissionAction } from '@/types/Permission'
import { Can } from '@casl/react'

const Abstracts = ({
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
}) => {
  const { data: session } = useSession()
  const ability = useMemo(
    () => abilityFromAuthzContext(session?.user.authz),
    [session?.user?.authz],
  )
  const { selectedDocument } = useStore((s) => s.document)
  return !edit ? (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Typography>{content}</Typography>
      <Can
        I={PermissionAction.update}
        a={selectedDocument}
        field='abstracts'
        ability={ability}
        passThrough
      >
        {(allowed: boolean) => (
          <Button
            disabled={!allowed}
            variant='outlined'
            startIcon={<EditIcon />}
            onClick={() => setEdit(true)}
            sx={{ minWidth: 'fit-content' }}
          >
            <Trans>document_details_page_abstracts_row_edit_button</Trans>
          </Button>
        )}
      </Can>
    </Box>
  ) : (
    <EditLocaleText
      field={field}
      callback={() => setEdit(false)}
      setAlert={setAlert}
    />
  )
}
export default Abstracts
