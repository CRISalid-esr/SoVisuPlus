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
  sortable?: boolean
}

interface DataTableProps {
  columns: Column[]
  data: any[] // eslint-disable-line @typescript-eslint/no-explicit-any
  page?: number
  rowsPerPage?: number
  order?: 'asc' | 'desc'
  orderBy?: string
  selected?: any[] // eslint-disable-line @typescript-eslint/no-explicit-any
  onPageChange?: (newPage: number) => void
  onRowsPerPageChange?: (newRowsPerPage: number) => void
  onOrderChange?: (order: 'asc' | 'desc', orderBy: string) => void
  onSelectionChange?: (selected: any[]) => void // eslint-disable-line @typescript-eslint/no-explicit-any
}

const DataTable: React.FC<DataTableProps> = ({
  columns,
  data,
  page: externalPage,
  rowsPerPage: externalRowsPerPage,
  order: externalOrder,
  orderBy: externalOrderBy,
  selected: externalSelected,
  onPageChange,
  onRowsPerPageChange,
  onOrderChange,
  onSelectionChange,
}) => {
  const [internalOrder, setInternalOrder] = useState<'asc' | 'desc'>('asc')
  const [internalOrderBy, setInternalOrderBy] = useState<string>('')
  const [internalPage, setInternalPage] = useState(0)
  const [internalRowsPerPage, setInternalRowsPerPage] = useState(5)
  const [internalSelected, setInternalSelected] = useState<any[]>([]) // eslint-disable-line @typescript-eslint/no-explicit-any
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({})

  const order = externalOrder ?? internalOrder
  const orderBy = externalOrderBy ?? internalOrderBy
  const page = externalPage ?? internalPage
  const rowsPerPage = externalRowsPerPage ?? internalRowsPerPage
  const selected = externalSelected ?? internalSelected

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc'
    const newOrder = isAsc ? 'desc' : 'asc'
    setInternalOrder(newOrder)
    setInternalOrderBy(property)
    onOrderChange?.(newOrder, property)
  }

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSelected = event.target.checked ? data.map((n) => n.id) : []
    setInternalSelected(newSelected)
    onSelectionChange?.(newSelected)
  }

  const handleSelectClick = (
    event: React.ChangeEvent<HTMLInputElement>,
    id: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  ) => {
    const newSelected = event.target.checked
      ? [...selected, id]
      : selected.filter((item) => item !== id)
    setInternalSelected(newSelected)
    onSelectionChange?.(newSelected)
  }

  const handleExpandClick = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleChangePage = (event: unknown, newPage: number) => {
    setInternalPage(newPage)
    onPageChange?.(newPage)
  }

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newRowsPerPage = parseInt(event.target.value, 10)
    setInternalRowsPerPage(newRowsPerPage)
    setInternalPage(0)
    onRowsPerPageChange?.(newRowsPerPage)
  }

  const createSortHandler = (property: string) => () => {
    handleRequestSort(property)
  }

  const sortedData = data.sort((a, b) => {
    if (orderBy && a[orderBy] < b[orderBy]) {
      return order === 'asc' ? -1 : 1
    }
    if (orderBy && a[orderBy] > b[orderBy]) {
      return order === 'asc' ? 1 : -1
    }
    return 0
  })

  const visibleData = sortedData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  )

  // Recursive Row Rendering Function
  const RenderRow = ({
    row,
  }: {
    row: any // eslint-disable-line @typescript-eslint/no-explicit-any
  }) => {
    // Handle collapse for this row
    const hasChildren =
      row.children &&
      (Array.isArray(row.children) || React.isValidElement(row.children))
    const handleExpand = () => {
      if (hasChildren) {
        handleExpandClick(row.id)
      }
    }

    //campute the depth of the row

    return (
      <React.Fragment key={row.id}>
        <TableRow>
          <TableCell padding='checkbox'>
            <Checkbox
              onChange={(event) => handleSelectClick(event, row.id)}
              checked={selected.includes(row.id)}
            />
          </TableCell>
          {hasChildren && (
            <TableCell
              padding='checkbox'
              sx={{
                paddingLeft: `16px`,
              }}
            >
              <IconButton onClick={handleExpand}>
                {expanded[row.id] ? <ArrowDropDown /> : <ArrowRight />}
              </IconButton>
            </TableCell>
          )}
          {columns.map((column) => (
            <TableCell key={column.id}>{row[column.id]}</TableCell>
          ))}
        </TableRow>
        {hasChildren && (
          <TableRow>
            <TableCell colSpan={columns.length + 1} padding='none'>
              <Collapse in={expanded[row.id]} timeout='auto' unmountOnExit>
                {Array.isArray(row.children) ? (
                  <Table>
                    <TableBody>
                      {row.children.map(
                        (
                          childRow: any, // eslint-disable-line @typescript-eslint/no-explicit-any
                        ) => (
                          <RenderRow key={childRow.id} row={childRow} />
                        ),
                      )}
                    </TableBody>
                  </Table>
                ) : (
                  row.children // Render JSX if `children` is not an array
                )}
              </Collapse>
            </TableCell>
          </TableRow>
        )}
      </React.Fragment>
    )
  }

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
                  {column.sortable ? (
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? order : 'asc'}
                      onClick={createSortHandler(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleData.map((row) => (
              <RenderRow key={row.id} row={row} />
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
