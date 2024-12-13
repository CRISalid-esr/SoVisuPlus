'use client'

import { Trans } from '@lingui/macro'
import { Box, Typography } from '@mui/material'
import DataTable from '@/components/datatable/datatable'
import { useState } from 'react'
export default function PublicationsPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [columns, setColumns] = useState([
    {
      id: 'title',
      label: 'Title',
    },
    {
      id: 'author',
      label: 'Author',
    },
    {
      id: 'date',
      label: 'Date',
    },
    {
      id: 'status',
      label: 'Status',
    },
    {
      id: 'version',
      label: 'Version',
    },
  ])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [data, setData] = useState([
    {
      title: 'Lorem ipsum',
      author: 'John Doe',
      date: '2021-10-01',
      status: <>jsx elemnt</>,
      version: '1.0',
      children: [
        {
          title: 'Dolor sit amet',
          author: 'Jane Doe',
          date: '2021-10-02',
          status: 'Draft',
          version: '1.1',
          children: [
            {
              title: 'Dolor sit amet 2',
              author: 'Jane Doe',
              date: '2021-10-02',
              status: 'Draft',
              version: '1.1',
            },
          ],
        },
      ],
    },
    {
      title: 'Dolor sit amet',
      author: 'Jane Doe',
      date: '2021-10-02',
      status: 'Draft',
      version: '1.1',
      children: <>JSX elment</>,
    },
  ])

  return (
    <Box sx={{ padding: 4 }}>
      <Typography variant='h4' gutterBottom>
        <Trans>side_bar_publications</Trans>
      </Typography>
      <DataTable columns={columns} data={data} />
    </Box>
  )
}
