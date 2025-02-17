'use client'

import { Dialog, DialogContent, DialogActions } from '@mui/material'
import { Box } from '@mui/system'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  header?: React.ReactNode
  actions?: React.ReactNode
}

const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  header,
  children,
  actions,
}) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm'>
      {header && <Box>{header}</Box>}
      <DialogContent>{children}</DialogContent>
      {actions && <DialogActions>{actions}</DialogActions>}
    </Dialog>
  )
}

export default Modal
