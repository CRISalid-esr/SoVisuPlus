import { Box, Chip } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { Literal } from '@/types/Literal'

interface LanguageChipsProps {
  texts: Literal[]
  selectedLang: string
  onLanguageSelect: (lang: string) => void
  isInline?: boolean
}

/**
 * A reusable component to display language selection chips.
 */
const LanguageChips = ({
  texts,
  selectedLang,
  onLanguageSelect,
  isInline,
}: LanguageChipsProps) => {
  const theme = useTheme()
  const hideUndeterminedLanguage = texts.length < 2
  return (
    <Box
      sx={
        isInline
          ? { display: 'flex', justifyContent: 'center', alignItems: 'center' }
          : {}
      }
    >
      {texts
        .filter((text) => !(text.language == 'ul' && hideUndeterminedLanguage))
        .map((text, index) => (
          <Chip
            key={index}
            size='small'
            sx={{
              marginRight: index == texts.length - 1 ? 0 : theme.spacing(1),
            }}
            clickable={text.language !== selectedLang}
            label={text.language == 'ul' ? 'n/a' : text.language}
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
/**
 * A reusable component to display language selection chips.
 */
export default LanguageChips
