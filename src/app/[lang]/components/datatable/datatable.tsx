// components/DataTable.tsx
import React, { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  TablePagination,
  TableSortLabel,
  IconButton,
  Collapse,
} from '@mui/material'
import { ArrowDropDown, ArrowRight } from '@mui/icons-material'

interface Column {
  id: string
  label: string
  numeric?: boolean
}

interface DataTableProps {
  columns: Column[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[]
}

interface RowData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

const DataTable: React.FC<DataTableProps> = ({ columns, data }) => {
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  const [orderBy, setOrderBy] = useState<string>('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(5)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selected, setSelected] = useState<any[]>([])
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({})

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(property)
  }

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelected(data.map((n) => n.id))
    } else {
      setSelected([])
    }
  }

  const handleSelectClick = (
    event: React.ChangeEvent<HTMLInputElement>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    id: any,
  ) => {
    setSelected((prev) =>
      event.target.checked ? [...prev, id] : prev.filter((item) => item !== id),
    )
  }

  const handleExpandClick = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  const createSortHandler = (property: string) => () => {
    handleRequestSort(property)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortedData = (array: any[]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return array.sort((a: any, b: any) => {
      if (orderBy && a[orderBy] < b[orderBy]) {
        return order === 'asc' ? -1 : 1
      }
      if (orderBy && a[orderBy] > b[orderBy]) {
        return order === 'asc' ? 1 : -1
      }
      return 0
    })
  }

  const visibleData = sortedData(
    data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
  )

  return (
    <Paper>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding='checkbox'>
                <Checkbox
                  onChange={handleSelectAllClick}
                  checked={selected.length === data.length}
                  indeterminate={
                    selected.length > 0 && selected.length < data.length
                  }
                />
              </TableCell>
              {columns.map((column) => (
                <TableCell key={column.id}>
                  <TableSortLabel
                    active={orderBy === column.id}
                    direction={orderBy === column.id ? order : 'asc'}
                    onClick={createSortHandler(column.id)}
                  >
                    {column.label}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleData.map((row: RowData) => (
              <React.Fragment key={row.id}>
                <TableRow>
                  <TableCell padding='checkbox'>
                    <Checkbox
                      onChange={(event) => handleSelectClick(event, row.id)}
                      checked={selected.indexOf(row.id) !== -1}
                    />
                  </TableCell>
                  {columns.map((column) => (
                    <TableCell key={column.id}>{row[column.id]}</TableCell>
                  ))}
                  <TableCell padding='checkbox'>
                    <IconButton onClick={() => handleExpandClick(row.id)}>
                      {expanded[row.id] ? <ArrowDropDown /> : <ArrowRight />}
                    </IconButton>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={columns.length + 1} padding='none'>
                    <Collapse
                      in={expanded[row.id]}
                      timeout='auto'
                      unmountOnExit
                    >
                      <Paper style={{ padding: 16 }}>
                        {/* Example of nested data */}
                        <pre>{JSON.stringify(row.nestedData, null, 2)}</pre>
                      </Paper>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        count={data.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  )
}

export default DataTable
