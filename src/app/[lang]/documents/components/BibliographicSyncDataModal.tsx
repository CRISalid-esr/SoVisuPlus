import { Trans } from '@lingui/macro'
import { FC, useState } from 'react'

import { BibliographicSyncDataStatus } from '@/types/BibliographicSyncDataStatus'
import {
  Box,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material'
import Image from 'next/image'
import { Modal } from '@/components/Modal'
import { useTheme } from '@mui/material/styles'
import { BibliographicSyncData } from '@/types/BibliographicSyncData'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'

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
  function SuccessSynchronization({
    platform,
  }: {
    platform: { changes: { added: number; updated: number; deleted: number } }
  }) {
    const [hovered, setHovered] = useState(false)

    const renderBibliographicPlatformChanges = (platform: {
      changes: { added: number; updated: number; deleted: number }
    }) => {
      return (
        <List>
          <ListItem
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'no-wrap',
            }}
          >
            <ListItemIcon>
              <FiberManualRecordIcon
                sx={{ fontSize: theme.utils.pxToRem(8) }}
              />
            </ListItemIcon>
            <ListItemText>
              {platform.changes.added}{' '}
              <Trans>
                documents_page_synchronize_modal_synchronize_success_tooltip_added_message
              </Trans>
            </ListItemText>
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <FiberManualRecordIcon
                sx={{ fontSize: theme.utils.pxToRem(8) }}
              />
            </ListItemIcon>
            <ListItemText>
              {platform.changes.updated}{' '}
              <Trans>
                documents_page_synchronize_modal_synchronize_success_tooltip_updated_message
              </Trans>
            </ListItemText>
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <FiberManualRecordIcon
                sx={{ fontSize: theme.utils.pxToRem(8) }}
              />
            </ListItemIcon>
            <ListItemText>
              {platform.changes.deleted}{' '}
              <Trans>
                documents_page_synchronize_modal_synchronize_success_tooltip_deleted_message
              </Trans>
            </ListItemText>
          </ListItem>
        </List>
      )
    }

    return (
      <Tooltip title={renderBibliographicPlatformChanges(platform)} arrow>
        <Box
          sx={{
            position: 'relative',
            display: 'inline-block',
            width: 40,
            height: 40,
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* Success Image */}
          <Image
            src='/icons/success.svg'
            alt='language'
            width={40}
            height={40}
            priority
          />

          {/* Plus Icon (Only Visible on Hover) */}
          {hovered && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.3)', // Optional: Dark overlay
                borderRadius: '50%',
              }}
            >
              <AddOutlinedIcon sx={{ color: 'white', fontSize: 24 }} />
            </Box>
          )}
        </Box>
      </Tooltip>
    )
  }

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
            sx={{
              lineHeight: theme.typography.lineHeight.lineHeight28px,
              fontStyle: 'normal',
              fontSize: theme.utils.pxToRem(28),
              fontWeight: theme.typography.fontWeightBold,
            }}
          >
            <Trans>documents_page_synchronize_modal_title</Trans> :
          </Typography>
        </Box>
      }
      actions={
        <>
          <Button
            variant='outlined'
            onClick={() => setOpenSynchronizeModal(false)}
            sx={{
              marginRight: 1,
              fontStyle: 'normal',
              fontSize: theme.utils.pxToRem(14),
              letterSpacing: '0.1px',
              lineHeight: theme.typography.lineHeight.lineHeight20px,
              fontWeight: theme.typography['500'],
            }}
          >
            <Trans>documents_page_synchronize_modal_cancel_button</Trans>
          </Button>
          <Button
            sx={{
              fontStyle: 'normal',
              fontSize: theme.utils.pxToRem(14),
              letterSpacing: '0.1px',
              lineHeight: theme.typography.lineHeight.lineHeight20px,
              fontWeight: theme.typography['500'],
            }}
            variant='contained'
          >
            <Trans>documents_page_synchronize_modal_synchronize_button</Trans>
          </Button>
        </>
      }
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {bibliographicSyncData.map((platform) => {
          return (
            <Box
              key={platform.name}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexDirection: 'column',
              }}
            >
              <Button
                variant='outlined'
                size='small'
                sx={{
                  marginRight: 1,
                  marginBottom: 2,
                  fontSize: theme.utils.pxToRem(16),
                  backgroundColor: platform.selected
                    ? theme.palette.primary.main
                    : theme.palette.white,
                  color: platform.selected
                    ? theme.palette.white
                    : theme.palette.primary.main,
                  fontWeight: theme.typography['500'],
                  lineHeight: theme.typography.lineHeight.lineHeight16px,
                  letterSpacing: '0.5px',
                  '&:hover': {
                    backgroundColor: platform.selected
                      ? theme.palette.primary.main
                      : theme.palette.white,
                    color: platform.selected
                      ? theme.palette.white
                      : theme.palette.primary.main,
                  },
                }}
                onClick={() => {
                  setBibliographicSyncData(
                    bibliographicSyncData.map((item) => {
                      if (item.name === platform.name) {
                        return {
                          ...item,
                          selected: !item.selected,
                        }
                      }
                      return item
                    }),
                  )
                }}
              >
                {platform.name}
              </Button>
              {platform.status === BibliographicSyncDataStatus.loading && (
                <CircularProgress
                  sx={{
                    width: 40,
                    height: 40,
                  }}
                />
              )}
              {platform.status === BibliographicSyncDataStatus.success && (
                <SuccessSynchronization platform={platform} />
              )}
              {platform.status === BibliographicSyncDataStatus.error && (
                <Image
                  src='/icons/error.svg'
                  alt='language'
                  width={40}
                  height={40}
                  priority
                />
              )}
            </Box>
          )
        })}
      </Box>
    </Modal>
  )
}

export default BibliographicSyncDataModal
