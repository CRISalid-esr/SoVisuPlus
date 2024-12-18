'use client'

import { Trans } from '@lingui/macro'
import { Box, Typography } from '@mui/material'
import { MaterialReactTable } from 'material-react-table'
import { useMemo, useState } from 'react'

import { TabFilter } from '@/components/TabFilter'

const tabs = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
]
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const data: any[] = [
  {
    name: {
      firstName: 'John',
      lastName: 'Doe',
    },
    address: '261 Erdman Ford',
    city: 'East Daphne',
    state: 'Kentucky',
  },
  {
    name: {
      firstName: 'Jane',
      lastName: 'Doe',
    },
    address: '769 Dominic Grove',
    city: 'Columbus',
    state: 'Ohio',
  },
  {
    name: {
      firstName: 'Joe',
      lastName: 'Doe',
    },
    address: '566 Brakus Inlet',
    city: 'South Linda',
    state: 'West Virginia',
  },
  {
    name: {
      firstName: 'Kevin',
      lastName: 'Vandy',
    },
    address: '722 Emie Stream',
    city: 'Lincoln',
    state: 'Nebraska',
  },
  {
    name: {
      firstName: 'Joshua',
      lastName: 'Rolluffs',
    },
    address: '32188 Larkin Turnpike',
    city: 'Omaha',
    state: 'Nebraska',
  },
]
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const columns = [
  {
    accessorKey: 'name.firstName', //access nested data with dot notation
    header: 'First Name',
    size: 150,
  },
  {
    accessorKey: 'name.lastName',
    header: 'Last Name',
    size: 150,
  },
  {
    accessorKey: 'address', //normal accessorKey
    header: 'Address',
    size: 200,
  },
  {
    accessorKey: 'city',
    header: 'City',
    size: 150,
  },
  {
    accessorKey: 'state',
    header: 'State',
    size: 150,
  },
]

export default function PublicationsPage() {
  const [selectedTab, setSelectedTab] = useState(tabs[0].value)

  const memoizedColumns = useMemo(() => columns, [columns])
  const memoizedData = useMemo(() => data, [data])

  const handleTabeChange = (newValue: string) => {
    setSelectedTab(newValue)
  }

  return (
    <Box sx={{ padding: 4 }}>
      <Typography variant='h4' gutterBottom>
        <Trans>side_bar_publications</Trans>
      </Typography>

      <TabFilter
        tabsData={tabs}
        selectedValue={selectedTab}
        onTabChange={handleTabeChange}
      />
      <MaterialReactTable
        columns={memoizedColumns}
        data={memoizedData}
        enablePagination
      />
    </Box>
  )
}
