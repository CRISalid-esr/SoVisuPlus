import { t } from '@lingui/core/macro'
import { Chip, ClickAwayListener, Tooltip } from '@mui/material'
import NotInSyncHalCollectionCard from '@/app/[lang]/documents/components/HalStatusBadge/NotInSyncHalCollectionCard'
import InHalCollectionCard from '@/app/[lang]/documents/components/HalStatusBadge/InHalCollectionCard'
import OutsideHalCard from '@/app/[lang]/documents/components/HalStatusBadge/OutsideHalCard'
import { HalSubmitType } from '@prisma/client'
import OutsideHalMissingIdCard from '@/app/[lang]/documents/components/HalStatusBadge/OutsideHalMissingIdCard'
import useStore from '@/stores/global_store'
import { useState } from 'react'

const halSubmitTypeTranslation = (halSubmitType: string | null) => {
  switch (halSubmitType) {
    case 'annex':
      return t`hal_submit_type_annex`
    case 'file':
      return t`hal_submit_type_file`
    case 'notice':
      return t`hal_submit_type_notice`
    default:
      return null
  }
}

export enum HalStatusCellType {
  InCollection = 'InCollection',
  NotInSyncWithCollection = 'NotInSyncWithCollection',
  OutsideHal = 'OutsideHal',
  OutsideHalMissingId = 'OutsideHalMissingId',
}

const multilineChipSx = {
  height: 'auto',
  padding: '.1875rem 0',
  '& .MuiChip-label': {
    display: 'block',
    whiteSpace: 'normal',
  },
}

export type HalStatusCellBadgeProps =
  | {
      type: HalStatusCellType.InCollection
      icon?: React.ReactElement | null
      acronyms: string[]
      isSingleLine?: boolean
      halSubmitType: HalSubmitType | null
      hasBeenUpdated?: boolean
      isOutOfCollection?: boolean
      halUrl: string | null
      documentUid?: string | null
    }
  | {
      type: HalStatusCellType.NotInSyncWithCollection
      icon?: React.ReactElement | null
      acronyms: string[]
      isSingleLine?: boolean
      halSubmitType: HalSubmitType | null
      hasBeenUpdated: boolean
      isOutOfCollection: boolean
      halUrl: string | null
      documentUid: string | null
    }
  | {
      type: HalStatusCellType.OutsideHal
      icon?: React.ReactElement | null
      acronyms?: string[]
      isSingleLine?: boolean
      halSubmitType?: HalSubmitType | null
      hasBeenUpdated?: boolean
      isOutOfCollection?: boolean
      halUrl?: string | null
      documentUid: string | null
    }
  | {
      type: HalStatusCellType.OutsideHalMissingId
      icon?: React.ReactElement | null
      acronyms?: string[]
      isSingleLine?: boolean
      halSubmitType?: HalSubmitType | null
      hasBeenUpdated?: boolean
      isOutOfCollection?: boolean
      halUrl?: string | null
      documentUid?: string | null
    }

const HalStatusCellBadge = ({
  type,
  icon,
  acronyms,
  isSingleLine,
  halSubmitType,
  hasBeenUpdated,
  isOutOfCollection,
  halUrl,
  documentUid,
}: HalStatusCellBadgeProps) => {
  const { ownPerspective } = useStore((state) => state.user)
  const [open, setOpen] = useState<boolean>(false)
  const openTooltip = () => {
    if (ownPerspective) {
      setOpen(!open)
    }
  }
  const closeTooltip = () => setOpen(false)
  if (type === HalStatusCellType.OutsideHalMissingId) {
    return (
      <ClickAwayListener onClickAway={() => setOpen(false)}>
        <Tooltip
          title={<OutsideHalMissingIdCard onClose={closeTooltip} />}
          open={open}
          slotProps={{
            tooltip: {
              sx: {
                backgroundColor: 'transparent',
                padding: 0,
                border: 'none',
              },
            },
          }}
          disableHoverListener={!ownPerspective || isSingleLine}
          disableFocusListener={!ownPerspective || isSingleLine}
          disableTouchListener={!ownPerspective || isSingleLine}
        >
          <Chip
            {...(!isSingleLine && { sx: multilineChipSx })}
            label={t`documents_page_hal_status_outside_hal`}
            size='small'
            color='error'
            onClick={ownPerspective && !isSingleLine ? openTooltip : undefined}
          />
        </Tooltip>
      </ClickAwayListener>
    )
  }

  if (type === HalStatusCellType.OutsideHal) {
    return (
      <ClickAwayListener onClickAway={() => setOpen(false)}>
        <Tooltip
          title={
            <OutsideHalCard onClose={closeTooltip} documentUid={documentUid} />
          }
          open={open}
          slotProps={{
            tooltip: {
              sx: {
                backgroundColor: 'transparent',
                padding: 0,
                border: 'none',
              },
            },
          }}
          disableHoverListener={!ownPerspective || isSingleLine}
          disableFocusListener={!ownPerspective || isSingleLine}
          disableTouchListener={!ownPerspective || isSingleLine}
        >
          <Chip
            {...(!isSingleLine && { sx: multilineChipSx })}
            label={t`documents_page_hal_status_outside_hal`}
            size='small'
            color='error'
            onClick={ownPerspective && !isSingleLine ? openTooltip : undefined}
          />
        </Tooltip>
      </ClickAwayListener>
    )
  }

  if (type === HalStatusCellType.NotInSyncWithCollection) {
    return (
      <ClickAwayListener onClickAway={() => setOpen(false)}>
        <Tooltip
          title={
            <NotInSyncHalCollectionCard
              update={hasBeenUpdated}
              icon={icon}
              acronyms={acronyms}
              halSubmitTypeStr={halSubmitTypeTranslation(halSubmitType)}
              isOutOfCollection={isOutOfCollection}
              halUrl={halUrl}
              onClose={closeTooltip}
              documentUid={documentUid}
            />
          }
          open={open}
          slotProps={{
            tooltip: {
              sx: {
                backgroundColor: 'transparent',
                padding: 0,
                border: 'none',
              },
            },
          }}
          disableHoverListener={!ownPerspective || isSingleLine}
          disableFocusListener={!ownPerspective || isSingleLine}
          disableTouchListener={!ownPerspective || isSingleLine}
        >
          <Chip
            {...(!isSingleLine && { sx: multilineChipSx })}
            {...(icon && { icon })}
            label={t`documents_page_hal_status_in_hal`}
            size='small'
            color='info'
            onClick={ownPerspective && !isSingleLine ? openTooltip : undefined}
          />
        </Tooltip>
      </ClickAwayListener>
    )
  }

  if (type === HalStatusCellType.InCollection) {
    return (
      <ClickAwayListener onClickAway={() => setOpen(false)}>
        <Tooltip
          title={
            <InHalCollectionCard
              icon={icon}
              acronyms={acronyms}
              halSubmitTypeStr={halSubmitTypeTranslation(halSubmitType)}
              halUrl={halUrl}
              onClose={closeTooltip}
            />
          }
          open={open}
          slotProps={{
            tooltip: {
              sx: {
                backgroundColor: 'transparent',
                padding: 0,
                border: 'none',
              },
            },
          }}
          disableHoverListener={!ownPerspective || isSingleLine}
          disableFocusListener={!ownPerspective || isSingleLine}
          disableTouchListener={!ownPerspective || isSingleLine}
        >
          <Chip
            {...(!isSingleLine && { sx: multilineChipSx })}
            {...(icon && { icon })}
            label={t`documents_page_hal_status_in_hal`}
            size='small'
            color='success'
            onClick={ownPerspective && !isSingleLine ? openTooltip : undefined}
          />
        </Tooltip>
      </ClickAwayListener>
    )
  }
}
export default HalStatusCellBadge
