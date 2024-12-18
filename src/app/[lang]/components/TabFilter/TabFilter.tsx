import { Tabs, Tab, Box } from '@mui/material'

type TabData = {
  label: string
  value: string
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
  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    onTabChange(newValue) // Call the parent's handler
  }

  return (
    <Box>
      <Tabs value={selectedValue} onChange={handleTabChange}>
        {tabsData.map((tab, index) => (
          <Tab key={index} label={tab.label} value={tab.value} />
        ))}
      </Tabs>
    </Box>
  )
}

export default TabFilter
