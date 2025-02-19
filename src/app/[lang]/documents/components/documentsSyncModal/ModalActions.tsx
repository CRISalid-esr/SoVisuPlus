import { Trans } from '@lingui/macro'
import { Button } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { FC } from 'react'

const ModalActions: FC<{ onClose: () => void }> = ({ onClose }) => {
  const theme = useTheme()
  return (
    <>
      <Button
        variant='outlined'
        onClick={onClose}
        sx={{ marginRight: 1, fontSize: theme.utils.pxToRem(14) }}
      >
        <Trans>documents_page_synchronize_modal_cancel_button</Trans>
      </Button>
      <Button variant='contained' sx={{ fontSize: theme.utils.pxToRem(14) }}>
        <Trans>documents_page_synchronize_modal_synchronize_button</Trans>
      </Button>
    </>
  )
}

export default ModalActions
