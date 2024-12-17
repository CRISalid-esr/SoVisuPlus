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
      sortable: true,
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
      sortable: false,
    },
  ])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [data, setData] = useState([
    {
      id: 1,
      title: 'Lorem ipsum',
      author: 'John Doe',
      date: '2021-10-01',
      status: <>jsx elemnt</>,
      version: '1.0',
    },
    {
      id: 4,
      title: 'Dolor sit amet',
      author: 'Jane Doe',
      date: '2021-10-02',
      status: 'Draft',
      version: '1.1',
      children: [
        {
          id: 5,
          title: 'Dolor sit amet test3',
          author: 'Jane Doe',
          date: '2021-10-02',
          status: 'Draft',
          version: '1.1',
        },
      ],
    },
  ])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderExpandableRow = (row: any) => {
    return (
      <Box
        style={{ padding: '16px', backgroundColor: '#f5f5f5', width: '100%' }}
      >
        <Typography variant='body2'>Custom content for row {row.id}</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ padding: 4 }}>
      <Typography variant='h4' gutterBottom>
        <Trans>side_bar_publications</Trans>
      </Typography>
      <DataTable
        columns={columns}
        data={data}
        expandableRows={true}
        renderExpandableRow={renderExpandableRow}
      />
    </Box>
  )
}
