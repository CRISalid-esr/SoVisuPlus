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
      <ListItem>
        <ListItemIcon
          sx={{
            marginRight: 0,
          }}
        >
          <FiberManualRecordIcon
            sx={{
              fontSize: theme.utils.pxToRem(8),
              color: theme.palette.white,
            }}
          />
        </ListItemIcon>
        <ListItemText
          sx={{
            fontWeight: theme.typography[500],
            fontSize: theme.utils.pxToRem(16),
            lineHeight: theme.typography.lineHeight.lineHeight16px,
            fontStyle: 'normal',
            letterSpacing: '0.5px',
          }}
        >
          {changes.added || 0}{' '}
          <Trans>
            documents_page_synchronize_modal_synchronize_success_tooltip_added_message
          </Trans>
        </ListItemText>
      </ListItem>
      <ListItem>
        <ListItemIcon
          sx={{
            marginRight: 0,
          }}
        >
          <FiberManualRecordIcon
            sx={{
              fontSize: theme.utils.pxToRem(8),
              color: theme.palette.white,
            }}
          />{' '}
        </ListItemIcon>
        <ListItemText
          sx={{
            fontWeight: theme.typography[500],
            fontSize: theme.utils.pxToRem(16),
            lineHeight: theme.typography.lineHeight.lineHeight16px,
            fontStyle: 'normal',
            letterSpacing: '0.5px',
          }}
        >
          {changes.updated || 0}{' '}
          <Trans>
            documents_page_synchronize_modal_synchronize_success_tooltip_updated_message
          </Trans>
        </ListItemText>
      </ListItem>
      <ListItem>
        <ListItemIcon
          sx={{
            marginRight: 0,
          }}
        >
          <FiberManualRecordIcon
            sx={{
              fontSize: theme.utils.pxToRem(8),
              color: theme.palette.white,
            }}
          />{' '}
        </ListItemIcon>
        <ListItemText
          sx={{
            fontWeight: theme.typography[500],
            fontSize: theme.utils.pxToRem(16),
            lineHeight: theme.typography.lineHeight.lineHeight16px,
            fontStyle: 'normal',
            letterSpacing: '0.5px',
          }}
        >
          {changes.deleted || 0}{' '}
          <Trans>
            documents_page_synchronize_modal_synchronize_success_tooltip_deleted_message
          </Trans>
        </ListItemText>
      </ListItem>
    </List>
  )
}

export default PlatformChangesList
