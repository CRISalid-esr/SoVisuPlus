import React, { FC, PropsWithChildren } from 'react'
import { Box, Chip, Paper } from '@mui/material'

interface CustomPaperProps {
  handleTagClick: (tag: string) => void
  searchTags: { label: string; value: string; selected: boolean }[]
}

const CustomPaper: FC<PropsWithChildren<CustomPaperProps>> = (props) => (
  <Paper {...props} onMouseDown={(event) => event.preventDefault()}>
    <Box
      sx={{
        p: 5,
        display: 'flex',
        gap: 1,
        flexWrap: 'wrap',
      }}
    >
      {props.searchTags.map((tag) => (
        <Chip
          key={tag.value}
          label={tag.label}
          onClick={() => props.handleTagClick(tag.value)}
          color={tag.selected ? 'primary' : 'default'}
          sx={{ cursor: 'pointer' }}
        />
      ))}
    </Box>
    <Box>{props.children}</Box>
  </Paper>
)

export default CustomPaper
