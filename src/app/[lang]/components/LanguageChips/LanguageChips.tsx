import { Literal } from '@/types/Literal'
import { Chip } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { FC } from 'react'

interface LanguageChipsProps {
  titles: Literal[]
  handleChangeSelectedLanguage: (lang: string) => void
  selectedLangue?: string | null
}

const LanguageChips: FC<LanguageChipsProps> = ({
  titles,
  handleChangeSelectedLanguage,
  selectedLangue,
}) => {
  const theme = useTheme()
  return (
    <>
      {titles.map((title, index) => {
        if (title.language === 'ul') {
          return null
        }
        return (
          <Chip
            key={index}
            size='small'
            sx={{
              marginRight: theme.spacing(1),
            }}
            clickable={title.language !== selectedLangue}
            label={title.language}
            onClick={(e) => {
              if (title.language === selectedLangue) {
                e.preventDefault()
                return
              }
              handleChangeSelectedLanguage(title.language)
            }}
            color={title.language === selectedLangue ? 'primary' : 'default'}
          />
        )
      })}
    </>
  )
}

export default LanguageChips
