import { Box, Chip } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { Literal } from '@/types/Literal'

interface LanguageChipsProps {
  texts: Literal[]
  selectedLang: string
  onLanguageSelect: (lang: string) => void
}

/**
 * A reusable component to display language selection chips.
 */
export default function LanguageChips({
  texts,
  selectedLang,
  onLanguageSelect,
}: LanguageChipsProps) {
  const theme = useTheme()

  return (
    <Box>
      {texts
        .filter((text) => text.language !== 'ul') // Ignore undetermined language
        .map((text, index) => (
          <Chip
            key={index}
            size='small'
            sx={{ marginRight: theme.spacing(1) }}
            clickable={text.language !== selectedLang}
            label={text.language}
            onClick={(e) => {
              if (text.language === selectedLang) {
                e.preventDefault()
                return
              }
              onLanguageSelect(text.language)
            }}
            color={text.language === selectedLang ? 'primary' : 'default'}
          />
        ))}
    </Box>
  )
}
