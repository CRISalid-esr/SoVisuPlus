import { Box, FormControlLabel, Stack, Switch, Typography } from '@mui/material'
import { t } from '@lingui/core/macro'

interface AuthorsToolbarProps {
  rankingMode: boolean
  disabled?: boolean
  readOnly?: boolean
  contributorCount: number
  affiliationCount: number
  onToggleRankingMode: (value: boolean) => void
}

const AuthorsToolbar = ({
  rankingMode,
  disabled,
  readOnly,
  contributorCount,
  affiliationCount,
  onToggleRankingMode,
}: AuthorsToolbarProps) => (
  <Stack
    direction='row'
    alignItems='center'
    justifyContent='space-between'
    flexWrap='wrap'
    spacing={2}
    sx={{ mb: 2 }}
  >
    <Typography variant='h6' sx={{ fontWeight: 700 }}>
      {t`documents_details_page_authors_tab_title`}
      {/* The asterisk marks the tab as editable; hide it in read-only mode. */}
      {!readOnly && (
        <Box component='span' sx={{ color: 'error.main', ml: 0.5 }}>
          *
        </Box>
      )}
    </Typography>

    <Stack direction='row' alignItems='center' spacing={2}>
      {!readOnly && (
        <FormControlLabel
          control={
            <Switch
              checked={rankingMode}
              disabled={disabled}
              onChange={(event) => onToggleRankingMode(event.target.checked)}
            />
          }
          label={t`documents_details_page_authors_tab_ranking_mode`}
        />
      )}
      <Typography variant='body2' color='textSecondary'>
        {t`documents_details_page_authors_tab_contributors_count`}:{' '}
        <Box component='span' sx={{ fontWeight: 700 }}>
          {contributorCount}
        </Box>
      </Typography>
      <Typography variant='body2' color='textSecondary'>
        {t`documents_details_page_authors_tab_affiliations_count`}:{' '}
        <Box component='span' sx={{ fontWeight: 700 }}>
          {affiliationCount}
        </Box>
      </Typography>
    </Stack>
  </Stack>
)

export default AuthorsToolbar
