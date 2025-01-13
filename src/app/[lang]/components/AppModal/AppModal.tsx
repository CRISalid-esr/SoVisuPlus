import React from 'react'
import { Modal, Box, Typography, IconButton, Button } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

interface AppModalProps {
  open: boolean
  onClose: () => void
  title?: React.ReactNode // Title now accepts ReactNode for more flexibility
  children?: React.ReactNode
  width?: number | string
  actions?: React.ReactNode // Allows passing action buttons
}

const AppModal: React.FC<AppModalProps> = ({
  open,
  onClose,
  title,
  children,
  width = 400,
  actions,
}) => {
  return (
    <Modal open={open} onClose={onClose} aria-labelledby='modal-title'>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: width,
          bgcolor: 'background.paper',
          boxShadow: 24,
          borderRadius: 2,
          p: 4,
        }}
      >
        {/* Modal Header */}
        {title && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            {title}
          </Box>
        )}

        {/* Modal Content */}
        <Box sx={{ mb: 2 }}>{children}</Box>

        {/* Modal Actions */}
        {actions && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 1,
              mt: 3,
            }}
          >
            {actions}
          </Box>
        )}
      </Box>
    </Modal>
  )
}

export default AppModal
