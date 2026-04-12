'use client'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'

import { TabFilter } from '@/components/TabFilter'
import { Box, Typography } from '@mui/material'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import useStore from '@/stores/global_store'
import { isPerson } from '@/types/Person'

// Import tab content components
import Authorizations from './components/authorizations/'
import MyProfile from './components/myProfile'
import Notifications from './components/notification'

const MyAccountPage = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentPerspective, ownPerspective } = useStore((state) => state.user)

  const tabs = [
    {
      label: ownPerspective
        ? t`my_account_page_my_profile_tab`
        : t({ id: 'account_page_profile_tab', message: 'Profile' }),
      value: 'my_profile',
    } /*,
    {
      label: t`my_account_page_authorizations_tab`,
      value: 'authorizations',
    },
    {
      label: t`my_account_page_notification_tab`,
      value: 'notification',
    },*/,
  ]

  // Get the initial tab from the URL, defaulting to the first tab
  const initialTab = searchParams.get('tab') || tabs[0].value
  const [selectedTab, setSelectedTab] = useState(initialTab)

  useEffect(() => {
    setSelectedTab(initialTab)
  }, [initialTab])

  const handleTabChange = (newValue: string) => {
    setSelectedTab(newValue)
    router.push(`?tab=${newValue}`, { scroll: false }) // Update URL without full page reload
  }

  // Function to render tab content
  const renderTabContent = () => {
    switch (selectedTab) {
      case 'my_profile':
        return <MyProfile />
      case 'authorizations':
        return <Authorizations />
      case 'notification':
        return <Notifications />
      default:
        return <MyProfile />
    }
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
            {ownPerspective ||
            !currentPerspective ||
            !isPerson(currentPerspective) ? (
              <Trans>side_bar_my_account</Trans>
            ) : (
              currentPerspective.getDisplayName()
            )}
          </Typography>
        </Box>
      </Box>
      <TabFilter
        tabsData={tabs}
        selectedValue={selectedTab}
        onTabChange={handleTabChange}
      />
      <Box mt={3}>{renderTabContent()}</Box>
    </Box>
  )
}
export default MyAccountPage
