import { Trans } from '@lingui/macro'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import { List, ListItem, ListItemIcon, ListItemText } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { FC } from 'react'

type ChangeType = 'added' | 'updated' | 'deleted'

const PlatformChangesList: FC<{ changes: Record<ChangeType, number> }> = ({
  changes,
}) => {
  const theme = useTheme()

  return (
    <List>
      {changes.added > 0 && (
        <ListItem>
          <ListItemIcon>
            <FiberManualRecordIcon sx={{ fontSize: theme.utils.pxToRem(8) }} />
          </ListItemIcon>
          <ListItemText>
            {changes.added}{' '}
            <Trans>
              documents_page_synchronize_modal_synchronize_success_tooltip_added_message
            </Trans>
          </ListItemText>
        </ListItem>
      )}
      {changes.updated > 0 && (
        <ListItem>
          <ListItemIcon>
            <FiberManualRecordIcon sx={{ fontSize: theme.utils.pxToRem(8) }} />
          </ListItemIcon>
          <ListItemText>
            {changes.updated}{' '}
            <Trans>
              documents_page_synchronize_modal_synchronize_success_tooltip_updated_message
            </Trans>
          </ListItemText>
        </ListItem>
      )}
      {changes.deleted > 0 && (
        <ListItem>
          <ListItemIcon>
            <FiberManualRecordIcon sx={{ fontSize: theme.utils.pxToRem(8) }} />
          </ListItemIcon>
          <ListItemText>
            {changes.deleted}{' '}
            <Trans>
              documents_page_synchronize_modal_synchronize_success_tooltip_deleted_message
            </Trans>
          </ListItemText>
        </ListItem>
      )}
    </List>
  )
}

export default PlatformChangesList
