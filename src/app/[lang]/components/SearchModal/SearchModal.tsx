import React, { useState } from 'react'
import {
  Box,
  TextField,
  Typography,
  Autocomplete,
  Paper,
  Chip,
} from '@mui/material'
import { AppModal } from '../AppModal'
import { Trans } from '@lingui/react'

interface Tag {
  label: string
  value: string
  selected: boolean
}

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
  const [searchTags, setSearchTags] = useState<Tag[]>([
    { label: 'Chercheurs', value: 'Researchers', selected: true },
    { label: 'Unités de recherche', value: 'Research units', selected: false },
    { label: 'Institutions', value: 'Institutions', selected: false },
  ])

  // Toggle tag selection
  const handleClickTag = (tagValue: string) => {
    setSearchTags((prevTags) =>
      prevTags.map((tag) =>
        tag.value === tagValue ? { ...tag, selected: !tag.selected } : tag,
      ),
    )
  }

  const CustomPaper = (props: any) => (
    <Paper
      {...props}
      onMouseDown={(event: { preventDefault: () => any }) =>
        event.preventDefault()
      }
    >
      <Box
        sx={{
          p: 5,
          display: 'flex',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        {searchTags.map((tag) => (
          <Chip
            key={tag.value}
            label={tag.label}
            onClick={() => handleClickTag(tag.value)}
            color={tag.selected ? 'primary' : 'default'}
            sx={{ cursor: 'pointer' }}
          />
        ))}
      </Box>
      <Box>{props.children}</Box>
    </Paper>
  )

  const renderGroup = (params: any) => {
    console.log('params', params)
    const count = params.children.length
    return (
      <li {...params.other}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1 }}>
          <Typography variant='body2'>
            {params.group} ({count})
          </Typography>
        </Box>
        <ul>{params.children}</ul>
      </li>
    )
  }

  // Options with categories
  const options = [
    { label: 'Option 1', category: 'Researchers' },
    { label: 'Option 2', category: 'Researchers' },
    { label: 'Option 3', category: 'Research units' },
    { label: 'Option 4', category: 'Research units' },
    { label: 'Option 5', category: 'Institutions' },
    { label: 'Option 6', category: 'Institutions' },
  ]

  // Filter options based on selected tags
  const filteredOptions = options.filter((option) =>
    searchTags.some((tag) => tag.selected && tag.value === option.category),
  )

  return (
    <Box>
      <AppModal
        open={open}
        onClose={onClose}
        title={
          <Typography variant='h6'>
            <Trans id='search_modal_title' />
          </Typography>
        }
      >
        <Autocomplete
          onClose={() => {}}
          renderGroup={renderGroup} // Custom group header
          disableCloseOnSelect={true}
          options={filteredOptions}
          groupBy={(option) => option.category} // Group by category
          renderInput={(params) => (
            <TextField
              {...params}
              label={<Trans id='search_modal_input_title' />}
            />
          )}
          slots={{
            paper: (props) => <CustomPaper {...props} />,
          }}
          fullWidth
          inputValue={searchTerm}
          onInputChange={(e, newInputValue) => setSearchTerm(newInputValue)}
          sx={{ mb: 2 }}
        />
      </AppModal>
    </Box>
  )
}

export default SearchModal
