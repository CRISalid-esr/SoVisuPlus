import { CustomCard } from '@/components/Card'
import { Trans } from '@lingui/react'
import { Box, Button, CardContent, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

function Keywords() {
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
            <Trans id='document_details_page_keywords_tab_card_title' />
          </Typography>
          <Button variant='contained' color='primary'>
            <Trans id='document_details_page_keywords_tab_card_validate_button' />
          </Button>
        </Box>
      }
    >
      <CardContent>Work in progress</CardContent>
    </CustomCard>
  )
}

export default Keywords
