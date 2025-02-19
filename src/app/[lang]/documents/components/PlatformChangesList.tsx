import { Trans } from '@lingui/macro'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import { List, ListItem, ListItemIcon, ListItemText } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { FC } from 'react'

const PlatformChangesList: FC<{
  changes: { added: number; updated: number; deleted: number }
}> = ({ changes }) => {
  const theme = useTheme()
  return (
    <List>
      {Object.entries(changes).map(([key, value]) => (
        <ListItem key={key}>
          <ListItemIcon>
            <FiberManualRecordIcon sx={{ fontSize: theme.utils.pxToRem(8) }} />
          </ListItemIcon>
          <ListItemText>
            {value}{' '}
            <Trans>{`documents_page_synchronize_modal_synchronize_success_tooltip_${key}_message`}</Trans>
          </ListItemText>
        </ListItem>
      ))}
    </List>
  )
}

export default PlatformChangesList
