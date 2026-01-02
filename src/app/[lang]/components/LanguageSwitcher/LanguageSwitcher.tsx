'use client'

import { t } from '@lingui/core/macro'
import Image from 'next/image'
import { Box } from '@mui/system'
import {
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'

type Props = {
  value: ExtendedLanguageCode
}

const LanguageSwitcher = ({ value }: Props) => {
  const theme = useTheme()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const supportedLocales = process.env.NEXT_PUBLIC_SUPPORTED_LOCALES?.split(
    ',',
  ) as unknown as Array<ExtendedLanguageCode>

  // Static messages so Lingui can extract them
  const localeTranslations: Partial<Record<ExtendedLanguageCode, string>> = {
    en: t`language_en`,
    fr: t`language_fr`,
  }

  const handleLangChange = (event: SelectChangeEvent<ExtendedLanguageCode>) => {
    const newLang = event.target.value as ExtendedLanguageCode

    const segments = pathname.split('/').filter(Boolean)
    // Replace the first segment (current lang) with the new one
    const rest = segments.slice(1).join('/')
    const qs = searchParams.toString()
    const href = `/${newLang}` + (rest ? `/${rest}` : '') + (qs ? `?${qs}` : '')
    router.push(href)
  }

  return (
    <Select
      aria-label='Language switcher'
      name='language switcher'
      variant='outlined'
      fullWidth
      value={value}
      onChange={handleLangChange}
      inputProps={{ 'aria-label': 'Language switcher' }}
      renderValue={(val) => (
        <Box sx={{ display: 'flex' }}>
          <Image
            src='/icons/language.svg'
            alt='language'
            width={24}
            height={24}
            priority
          />
          <Box
            component='span'
            sx={{
              ml: 1,
              color: theme.palette.primaryContainer,
              fontSize: theme.utils.pxToRem(16),
              lineHeight: theme.typography.lineHeight.lineHeight24px,
              fontWeight: theme.typography.fontWeightRegular,
            }}
          >
            {localeTranslations[val as ExtendedLanguageCode] ?? String(val)}
          </Box>
        </Box>
      )}
      sx={{
        '& .MuiOutlinedInput-notchedOutline': {
          border: '1px solid transparent',
        },
        '& :focus-visible': {
          outline: '2px solid #fff',
          border: '2px solid #000',
        },
        '& .MuiSelect-icon': { color: theme.palette.white },
        '& .MuiOutlinedInput-root': {
          fontSize: theme.utils.pxToRem(16),
          '& fieldset': { border: 0 },
        },
        '& .MuiInputBase-input': {
          fontWeight: theme.typography.fontWeightRegular,
          color: theme.palette.white,
          opacity: 1,
          lineHeight: theme.typography.lineHeight.lineHeight24px,
        },
      }}
    >
      {supportedLocales?.map((locale) => (
        <MenuItem key={locale} value={locale}>
          <ListItemText>{localeTranslations[locale] ?? locale}</ListItemText>
        </MenuItem>
      ))}
    </Select>
  )
}
export default LanguageSwitcher
