'use client'

import { TabFilter } from '@/components/TabFilter'
import { t, Trans } from '@lingui/macro'
import { Box, Typography } from '@mui/material'
import { useTheme } from '@mui/system'
import { useState } from 'react'

export default function MyAccountPage() {
  const theme = useTheme()

  const tabs = [
    {
      label: t`my_account_page_my_profile_tab`,
      value: 'my_profile',
    },
    {
      label: t`my_account_page_authorizations_tab`,
      value: 'authorizations',
    },
    {
      label: t`my_account_page_notification_tab`,
      value: 'notification',
    },
  ]

  const [selectedTab, setSelectedTab] = useState(tabs[0].value)

  const handleTabeChange = (newValue: string) => {
    setSelectedTab(newValue)
  }

  return (
    <Box>
      <Box
        mb={3}
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: {
            xs: 'flex-start',
            md: 'center',
          },
          flexDirection: {
            xs: 'column',
            sm: 'row',
          },
        }}
      >
        <Box>
          <Typography variant='h4' gutterBottom>
            <Trans>side_bar_my_account</Trans>
          </Typography>
        </Box>
      </Box>
      <TabFilter
        tabsData={tabs}
        selectedValue={selectedTab}
        onTabChange={handleTabeChange}
      />
    </Box>
  )
}
