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
    <Box
      sx={(theme) => ({
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        borderBottom: '1px solid #DDE4E1',
        marginBottom: theme.spacing(8),
      })}
    >
      <Tabs
        value={selectedValue}
        onChange={handleTabChange}
        variant='scrollable'
        scrollButtons='auto'
        aria-label='scrollable tabs'
        sx={{
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
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
