'use client'

import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  useTheme,
} from '@mui/material'
import { Trans } from '@lingui/macro'
import Image from 'next/image'
import { FC, useEffect, useState } from 'react'
import useStore from '@/app/stores/global_store'
import HarvestingDetails from './HarvestingDetails'
import { BibliographicPlatform } from '@/types/BibliographicPlatform'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'

interface DocumentSyncDialogProps {
  openSynchronizeModal: boolean
  setOpenSynchronizeModal: (value: boolean) => void
  personUid: string
}

const DocumentSyncDialog: FC<DocumentSyncDialogProps> = ({
  openSynchronizeModal,
  setOpenSynchronizeModal,
  personUid,
}) => {
  const theme = useTheme()

  const rawHarvestings = useStore((state) => state.harvesting.harvestings)
  const harvestings = rawHarvestings[personUid] || {}

  const [selectedPlatforms, setSelectedPlatforms] = useState<
    Record<BibliographicPlatform, boolean>
  >(
    () =>
      Object.fromEntries(
        Object.values(BibliographicPlatform).map((p) => [p, true]),
      ) as Record<BibliographicPlatform, boolean>,
  )

  const initializeHarvesting = useStore(
    (state) => state.harvesting.initializeHarvesting,
  )
  const triggerHarvestings = useStore(
    (state) => state.harvesting.triggerHarvestings,
  )

  const handleTriggerHarvesting = async () => {
    const platforms = Object.entries(selectedPlatforms)
      .filter(([, isSelected]) => isSelected)
      .map(([platform]) => platform as BibliographicPlatform)

    if (platforms.length === 0) return

    await triggerHarvestings(personUid, platforms)
  }

  useEffect(() => {
    if (!rawHarvestings[personUid]) {
      initializeHarvesting(personUid)
    }
  }, [personUid, rawHarvestings, initializeHarvesting])

  const isDialogActive = Object.values(harvestings).some(
    (h) => h?.status === 'running' || h?.status === 'pending',
  )

  return (
    <Dialog
      open={openSynchronizeModal}
      onClose={() => setOpenSynchronizeModal(false)}
      fullWidth
      maxWidth='md'
    >
      <DialogTitle>
        <Trans>documents_page_synchronize_modal_title</Trans>
      </DialogTitle>

      <DialogContent dividers>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 3,
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
          }}
        >
          {Object.values(BibliographicPlatform).map((platform) => {
            const data = harvestings?.[platform]
            if (!data) return null

            return (
              <Box
                key={platform}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minWidth: 120,
                  maxWidth: 140,
                  padding: theme.spacing(1),
                  borderRadius: 2,
                  boxShadow: 1,
                  backgroundColor: 'background.paper',
                }}
              >
                <Button
                  variant={
                    selectedPlatforms[platform] ? 'contained' : 'outlined'
                  }
                  size='small'
                  sx={{
                    marginBottom: 2,
                    fontSize: theme.utils.pxToRem(16),
                    fontWeight: '500',
                  }}
                  onClick={() =>
                    setSelectedPlatforms((prev) => ({
                      ...prev,
                      [platform]: !prev[platform],
                    }))
                  }
                >
                  {platform}
                </Button>

                {data.status === 'not_performed' && (
                  <Image
                    src='/icons/inactive.svg'
                    alt='not performed'
                    width={40}
                    height={40}
                    priority
                  />
                )}
                {data.status === 'running' && (
                  <CircularProgress sx={{ width: 40, height: 40 }} />
                )}
                {data.status === 'completed' && (
                  <Image
                    src='/icons/success.svg'
                    alt='success'
                    width={40}
                    height={40}
                    priority
                  />
                )}
                {data.status === 'pending' && (
                  <HourglassEmptyIcon sx={{ width: 40, height: 40 }} />
                )}

                {data.status === 'failed' && (
                  <Image
                    src='/icons/error.svg'
                    alt='error'
                    width={40}
                    height={40}
                    priority
                  />
                )}
                {data.status !== 'not_performed' && (
                  <HarvestingDetails changes={data.result} />
                )}
              </Box>
            )
          })}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button
          variant='outlined'
          onClick={() => setOpenSynchronizeModal(false)}
        >
          {isDialogActive ? (
            <Trans>documents_page_synchronize_modal_hide_button</Trans>
          ) : (
            <Trans>documents_page_synchronize_modal_cancel_button</Trans>
          )}
        </Button>

        <Button
          variant='contained'
          disabled={isDialogActive}
          onClick={handleTriggerHarvesting}
        >
          <Trans>documents_page_synchronize_modal_synchronize_button</Trans>
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DocumentSyncDialog
