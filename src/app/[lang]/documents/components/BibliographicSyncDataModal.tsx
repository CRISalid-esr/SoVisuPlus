import { Modal } from '@/components/Modal'
import { BibliographicSyncData } from '@/types/BibliographicSyncData'
import { BibliographicSyncDataStatus } from '@/types/BibliographicSyncDataStatus'
import { Trans } from '@lingui/macro'
import { Box, Button, CircularProgress, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import Image from 'next/image'
import { FC } from 'react'
import ModalActions from './ModalActions'
import SuccessSynchronization from './SuccessSynchronization'

interface BibliographicSyncDataModalProps {
  bibliographicSyncData: BibliographicSyncData[]
  setBibliographicSyncData: (value: BibliographicSyncData[]) => void
  openSynchronizeModal: boolean
  setOpenSynchronizeModal: (value: boolean) => void
}

const BibliographicSyncDataModal: FC<BibliographicSyncDataModalProps> = ({
  bibliographicSyncData,
  setBibliographicSyncData,
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
        {bibliographicSyncData.map((platform) => (
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
                setBibliographicSyncData(
                  bibliographicSyncData.map((item) =>
                    item.name === platform.name
                      ? { ...item, selected: !item.selected }
                      : item,
                  ),
                )
              }
            >
              {platform.name}
            </Button>
            {platform.status === BibliographicSyncDataStatus.loading && (
              <CircularProgress sx={{ width: 40, height: 40 }} />
            )}
            {platform.status === BibliographicSyncDataStatus.success && (
              <SuccessSynchronization platform={platform} />
            )}
            {platform.status === BibliographicSyncDataStatus.error && (
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

export default BibliographicSyncDataModal
