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
    justifyContent='flex-end'
    flexWrap='wrap'
    spacing={2}
    sx={{ mb: 2 }}
  >
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
