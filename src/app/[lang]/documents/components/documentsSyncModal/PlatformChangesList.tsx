import { Trans } from '@lingui/react/macro'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import { List, ListItem, ListItemIcon, ListItemText } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { FC } from 'react'

type ChangeType = 'created' | 'updated' | 'deleted' | 'unchanged'

const PlatformChangesList: FC<{ changes: Record<ChangeType, number> }> = ({
  changes,
}) => {
  const theme = useTheme()

  console.log('PlatformChangesList changes', changes)

  return (
    <List>
      {/*list item for unchanged*/}
      <ListItem>
        <ListItemIcon
          sx={{
            minWidth: theme.spacing(2),
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
          {changes.unchanged || 0}{' '}
        </ListItemText>
      </ListItem>
      <ListItem>
        <ListItemIcon
          sx={{
            minWidth: theme.spacing(2),
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
          {changes.created || 0}{' '}
          <Trans>
            documents_page_synchronize_modal_synchronize_details_created
          </Trans>
        </ListItemText>
      </ListItem>
      <ListItem>
        <ListItemIcon
          sx={{
            minWidth: theme.spacing(2),
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
            documents_page_synchronize_modal_synchronize_details_updated
          </Trans>
        </ListItemText>
      </ListItem>
      <ListItem>
        <ListItemIcon
          sx={{
            minWidth: theme.spacing(2),
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
            documents_page_synchronize_modal_synchronize_details_deleted
          </Trans>
        </ListItemText>
      </ListItem>
    </List>
  )
}

export default PlatformChangesList
