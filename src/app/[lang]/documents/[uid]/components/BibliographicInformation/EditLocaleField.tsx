import { Avatar, Box, IconButton, TextField, Tooltip } from '@mui/material'
import { LanguageChips } from '@/components/LanguageChips'
import DeleteIcon from '@mui/icons-material/Delete'
import { Literal } from '@/types/Literal'
import { useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { useTheme } from '@mui/system'

const EditLocaleField = ({
  literal,
  deleteLang,
}: {
  literal: Literal
  deleteLang: (lang: ExtendedLanguageCode) => void
}) => {
  const theme = useTheme()
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Avatar
          sx={{
            width: '24px',
            height: '24px',
            fontSize: '12px',
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.white,
          }}
        >
          {literal.language}
        </Avatar>
        <Tooltip title={<Trans>edit_field_delete_button_tooltip</Trans>}>
          <IconButton onClick={() => deleteLang(literal.language)}>
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <TextField
        defaultValue={literal.value}
        onChange={(event) => (literal.value = event.target.value)}
        sx={{ flex: 1 }}
      />
    </Box>
  )
}

export default EditLocaleField
