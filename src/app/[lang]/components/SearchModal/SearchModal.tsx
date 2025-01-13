import React, { useState } from 'react'
import { Box, TextField, Button, Typography } from '@mui/material'
import { AppModal } from '../AppModal'
import { Trans } from '@lingui/react'

interface SearchModalProps {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  items: string[] // List of items to search from
}

const SearchModal: React.FC<SearchModalProps> = ({
  open,
  onClose,
  title = 'Search Items',
  items,
}) => {
  const [searchTerm, setSearchTerm] = useState('')

  // Filter items based on the search term
  const filteredItems = items.filter((item) =>
    item.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <Box>
      <AppModal
        open={open}
        onClose={onClose}
        title={
          <Typography>
            <Trans id='search_modal_title' />
          </Typography>
        }
      >
        <TextField
          label='Search'
          variant='outlined'
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 2 }}
        />
      </AppModal>
    </Box>
  )
}

export default SearchModal
