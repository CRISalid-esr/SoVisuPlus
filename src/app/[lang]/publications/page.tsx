'use client'

import { Trans } from '@lingui/macro'
import { Box, Typography } from '@mui/material'
import DataTable from '@/components/datatable/datatable'
export default function PublicationsPage() {
  const columns = [
    { id: 'id', label: 'ID' },
    { id: 'name', label: 'Name' },
    { id: 'email', label: 'Email' },
  ]

  const data = [
    {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      nestedData: { address: '123 Main St' },
    },
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane@example.com',
      nestedData: { address: '456 Elm St' },
    },
    {
      id: 3,
      name: 'Alice Johnson',
      email: 'alice@example.com',
      nestedData: { address: '789 Pine St' },
    },
    {
      id: 4,
      name: 'Bob Brown',
      email: 'bob@example.com',
      nestedData: { address: '101 Maple St' },
    },
  ]

  return (
    <Box sx={{ padding: 4 }}>
      <Typography variant='h4' gutterBottom>
        <Trans>side_bar_publications</Trans>
      </Typography>
      <DataTable columns={columns} data={data} />
    </Box>
  )
}
