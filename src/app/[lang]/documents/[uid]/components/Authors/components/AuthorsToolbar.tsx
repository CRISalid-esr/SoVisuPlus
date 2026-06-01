import { FormControlLabel, Stack, Switch, Typography } from '@mui/material'
import { t } from '@lingui/core/macro'

interface AuthorsToolbarProps {
  rankingMode: boolean
  disabled?: boolean
  contributorCount: number
  affiliationCount: number
  onToggleRankingMode: (value: boolean) => void
}

const AuthorsToolbar = ({
  rankingMode,
  disabled,
  contributorCount,
  affiliationCount,
  onToggleRankingMode,
}: AuthorsToolbarProps) => (
  <Stack
    direction='row'
    alignItems='center'
    justifyContent='space-between'
    sx={{ mb: 2 }}
  >
    <Typography variant='body2' color='textSecondary'>
      {t`documents_details_page_authors_tab_contributors_count`}:{' '}
      {contributorCount}
      {' · '}
      {t`documents_details_page_authors_tab_affiliations_count`}:{' '}
      {affiliationCount}
    </Typography>
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
  </Stack>
)

export default AuthorsToolbar
