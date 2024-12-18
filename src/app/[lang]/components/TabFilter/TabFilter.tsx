import { Badge, Box, Tab, Tabs, Typography } from '@mui/material'
import { useTheme } from '@mui/system'

type TabData = {
  label: string
  value: string
  numberOfItems?: number
  color: string
}

type TabFilterProps = {
  tabsData: TabData[]
  selectedValue: string
  onTabChange: (newValue: string) => void
}

const TabFilter = ({
  tabsData = [],
  selectedValue,
  onTabChange,
}: TabFilterProps) => {
  const theme = useTheme()

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    onTabChange(newValue) // Call the parent's handler
  }

  return (
    <Box sx={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
      <Tabs
        value={selectedValue}
        onChange={handleTabChange}
        variant='scrollable'
        scrollButtons='auto'
        allowScrollButtonsMobile
        sx={{
          '.MuiTabs-scrollButtons': {
            display: 'inline-flex',
          },
        }}
      >
        {tabsData.map((tab, index) => (
          <Tab
            sx={{
              textTransform: 'none',
            }}
            key={index}
            label={
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Typography mr={2}>{tab.label}</Typography>
                {tab.numberOfItems && (
                  <Badge
                    sx={{
                      ' .MuiBadge-badge': {
                        color: theme.palette.white,
                        backgroundColor: tab.color,
                      },
                    }}
                    badgeContent={tab.numberOfItems}
                  />
                )}
              </Box>
            }
            value={tab.value}
          />
        ))}
      </Tabs>
    </Box>
  )
}

export default TabFilter
