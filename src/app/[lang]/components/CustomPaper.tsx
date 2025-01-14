import React, { FC, PropsWithChildren } from 'react'
import { Box, Chip, Paper } from '@mui/material'

interface CustomPaperProps {
  handleTagClick: (tag: string) => void
  searchTags: { label: string; value: string; selected: boolean }[]
}

const CustomPaper: FC<PropsWithChildren<CustomPaperProps>> = ({
  handleTagClick,
  searchTags,
  children,
  ...rest
}) => {
  const tagValues: string[] = []
  return (
    <Paper {...rest} onMouseDown={(event) => event.preventDefault()}>
      <Box
        sx={{
          p: 5,
          display: 'flex',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        {searchTags.map((tag) => {
          if (tagValues.includes(tag.value) || tag.value === '') {
            return null
          }
          tagValues.push(tag.value)
          return (
            <Chip
              key={tag.value}
              label={tag.label}
              onClick={() => handleTagClick(tag.value)}
              color={tag.selected ? 'primary' : 'default'}
              sx={{ cursor: 'pointer' }}
            />
          )
        })}
      </Box>
      <Box>{children}</Box>
    </Paper>
  )
}

export default CustomPaper
