import { Modal } from '@/components/Modal'
import { DocumentSync } from '@/types/DocumentSync'
import { DocumentSyncStatus } from '@/types/DocumentSyncStatus'
import { Trans } from '@lingui/macro'
import { Box, Button, CircularProgress, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import Image from 'next/image'
import { FC } from 'react'
import ModalActions from './ModalActions'
import SuccessSynchronization from './SuccessSynchronization'

interface DocumentSyncModalProps {
  documentSync: DocumentSync[]
  setDocumentSync: (value: DocumentSync[]) => void
  openSynchronizeModal: boolean
  setOpenSynchronizeModal: (value: boolean) => void
}

const DocumentSyncModalProps: FC<DocumentSyncModalProps> = ({
  documentSync,
  setDocumentSync,
  openSynchronizeModal,
  setOpenSynchronizeModal,
}) => {
  const theme = useTheme()

  return (
    <Modal
      open={openSynchronizeModal}
      onClose={() => setOpenSynchronizeModal(false)}
      header={
        <Box
          sx={{
            marginTop: theme.spacing(2),
            marginLeft: theme.utils.pxToRem(20),
          }}
        >
          <Typography
            variant='h6'
            gutterBottom
            sx={{ fontSize: theme.utils.pxToRem(28), fontWeight: 'bold' }}
          >
            <Trans>documents_page_synchronize_modal_title</Trans> :
          </Typography>
        </Box>
      }
      actions={<ModalActions onClose={() => setOpenSynchronizeModal(false)} />}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {documentSync.map((platform) => (
          <Box
            key={platform.name}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Button
              variant='outlined'
              size='small'
              sx={{
                marginBottom: 2,
                fontSize: theme.utils.pxToRem(16),
                fontWeight: '500',
              }}
              onClick={() =>
                setDocumentSync(
                  documentSync.map((item) =>
                    item.name === platform.name
                      ? { ...item, selected: !item.selected }
                      : item,
                  ),
                )
              }
            >
              {platform.name}
            </Button>
            {platform.status === DocumentSyncStatus.loading && (
              <CircularProgress sx={{ width: 40, height: 40 }} />
            )}
            {platform.status === DocumentSyncStatus.success && (
              <SuccessSynchronization platform={platform} />
            )}
            {platform.status === DocumentSyncStatus.error && (
              <Image
                src='/icons/error.svg'
                alt='error'
                width={40}
                height={40}
                priority
              />
            )}
          </Box>
        ))}
      </Box>
    </Modal>
  )
}

export default DocumentSyncModalProps
