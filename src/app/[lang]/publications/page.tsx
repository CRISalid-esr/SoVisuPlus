'use client'

import { Trans } from '@lingui/macro'
import { Box, Typography } from '@mui/material'
import DataTable from '@/components/datatable/datatable'
import { useState } from 'react'
import { useLingui } from '@lingui/react'

export default function PublicationsPage() {
  const { i18n } = useLingui()

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [columns, setColumns] = useState([
    {
      id: 'title',
      label: 'Title',
      sortable: true,
      visible: true,
    },
    {
      id: 'author',
      label: 'Author',
      visible: true,
    },
    {
      id: 'date',
      label: 'Date',
      visible: true,
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      renderCell: (row: any, column: any) => {
        return <Typography>{i18n.date(new Date(row[column.id]))}</Typography>
      },
    },
    {
      id: 'status',
      label: 'Status',
      visible: true,
    },
    {
      id: 'version',
      label: 'Version',
      sortable: false,
      visible: true,
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      renderCell: (row: any, column: any) => {
        const formattedNumber = i18n.number(row[column.id], {
          style: 'decimal',
          maximumFractionDigits: 2,
          minimumFractionDigits: 1,
        })

        return <Typography>{formattedNumber}</Typography>
      },
    },
  ])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [data, setData] = useState([
    {
      id: 1,
      title: 'Lorem ipsum',
      author: 'John Doe',
      date: '2023-10-01',
      status: 'Published',
      version: '1.0',
    },
    {
      id: 4,
      title: 'Dolor sit amet',
      author: 'Jane Doe',
      date: '2023-10-02',
      status: 'Draft',
      version: '1.1',
    },
  ])
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ const renderExpandableRow =
    (row: any) => {
      return (
        <Box
          style={{ padding: '16px', backgroundColor: '#f5f5f5', width: '100%' }}
        >
          <Typography variant='body2'>
            Custom content for row {row.id}
          </Typography>
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
        selectableRows={true}
      />
    </Box>
  )
}
