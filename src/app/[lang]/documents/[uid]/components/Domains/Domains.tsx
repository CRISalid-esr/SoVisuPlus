import { t } from '@lingui/core/macro'
import { CustomCard } from '@/components/Card'
import { Trans } from '@lingui/react'
import { Box, CardContent, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import WorkInProgress from '@/components/WorkInProgress/WorkInProgress'

const Domains = () => {
  const theme = useTheme()

  return (
    <CustomCard
      header={
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography
            sx={{
              color: theme.palette.primary.main,
              fontSize: theme.utils.pxToRem(20),
              fontStyle: 'normal',
              fontWeight: theme.typography.fontWeightRegular,
              lineHeight: 'normal',
            }}
          >
            <Trans id='document_details_page_domains_tab_card_title' />
          </Typography>
        </Box>
      }
    >
      <CardContent>
        <WorkInProgress
          title={t`document_details_page_domains_tab_wip_title`}
          description={t`document_details_page_domains_tab_wip_description`}
          variant='inline'
        />
      </CardContent>
    </CustomCard>
  )
}

export default Domains
