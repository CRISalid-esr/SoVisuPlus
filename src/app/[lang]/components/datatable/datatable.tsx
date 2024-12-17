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
  Typography,
} from '@mui/material'
import { ArrowDropDown, ArrowRight } from '@mui/icons-material'

interface Column {
  id: string
  label: string
  numeric?: boolean
  sortable?: boolean
  renderCell?: (row: any, column: Column, depth?: number) => React.ReactNode // eslint-disable-line @typescript-eslint/no-explicit-any
  expandable?: boolean
  renderExpandableRow?: (row: any) => React.ReactNode // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface DataTableProps {
  columns: Column[]
  data: any[] // eslint-disable-line @typescript-eslint/no-explicit-any
  page?: number
  rowsPerPage?: number
  order?: 'asc' | 'desc'
  orderBy?: string
  selected?: any[] // eslint-disable-line @typescript-eslint/no-explicit-any
  expandableRows?: boolean
  selectableRows?: boolean
  onPageChange?: (newPage: number) => void
  onRowsPerPageChange?: (newRowsPerPage: number) => void
  onOrderChange?: (order: 'asc' | 'desc', orderBy: string) => void
  onSelectionChange?: (selected: any[]) => void // eslint-disable-line @typescript-eslint/no-explicit-any
  renderExpandableRow?: (row: any) => React.ReactNode // eslint-disable-line @typescript-eslint/no-explicit-any
  onExpandChange?: (expanded: { [key: string]: boolean }) => void
}

const DataTable: React.FC<DataTableProps> = ({
  columns,
  data,
  page: externalPage,
  rowsPerPage: externalRowsPerPage,
  order: externalOrder,
  orderBy: externalOrderBy,
  selected: externalSelected,
  expandableRows,
  selectableRows,
  onPageChange,
  onRowsPerPageChange,
  onOrderChange,
  onSelectionChange,
  renderExpandableRow,
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

  const RenderRow = ({
    row,
    depth = 0, // Depth to track nesting
  }: {
    row: any // eslint-disable-line @typescript-eslint/no-explicit-any
    depth?: number
  }) => {
    const hasChildren =
      row.children && Array.isArray(row.children) && row.children.length > 0

    const handleExpand = () => {
      if (hasChildren || (!hasChildren && depth === 0 && renderExpandableRow)) {
        handleExpandClick(row.id)
      }
    }

    const computeColSpan = (): number => {
      let colSpan = columns.length
      if (expandableRows) colSpan += 1
      if (selectableRows) colSpan += 1
      return colSpan
    }

    return (
      <React.Fragment key={row.id}>
        {/* Primary Row */}
        <TableRow>
          {/* Checkbox column */}
          {selectableRows && (
            <TableCell padding={depth > 0 ? 'none' : 'checkbox'}>
              <Checkbox
                onChange={(event) => handleSelectClick(event, row.id)}
                checked={selected.includes(row.id)}
              />
            </TableCell>
          )}

          {/* Expandable column */}
          {expandableRows && (
            <TableCell padding={depth > 0 ? 'none' : 'checkbox'}>
              {hasChildren || (depth === 0 && renderExpandableRow) ? (
                <IconButton onClick={handleExpand} size='small'>
                  {expanded[row.id] ? <ArrowDropDown /> : <ArrowRight />}
                </IconButton>
              ) : null}
            </TableCell>
          )}

          {/* Row Data */}
          {columns.map((column) => (
            <TableCell
              key={column.id}
              padding={depth > 0 ? 'none' : 'normal'} // No padding for children
            >
              {column.renderCell
                ? column.renderCell(row, column, depth)
                : row[column.id]}
            </TableCell>
          ))}
        </TableRow>

        {/* Nested children */}
        {hasChildren && (
          <TableRow>
            <TableCell colSpan={computeColSpan()} padding='none'>
              <Collapse in={expanded[row.id]} timeout='auto' unmountOnExit>
                <Table size='small'>
                  <TableBody>
                    {/* Recursively render children */}
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {row.children.map((child: any) => (
                      <RenderRow key={child.id} row={child} depth={depth + 1} />
                    ))}
                  </TableBody>
                </Table>
              </Collapse>
            </TableCell>
          </TableRow>
        )}

        {/* Expandable content */}
        {!hasChildren && depth === 0 && renderExpandableRow && (
          <TableRow>
            <TableCell colSpan={computeColSpan()} padding='none'>
              <Collapse in={expanded[row.id]} timeout='auto' unmountOnExit>
                {renderExpandableRow(row)}
              </Collapse>
            </TableCell>
          </TableRow>
        )}
      </React.Fragment>
    )
  }
  return (
    <Paper elevation={1}>
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
              <TableCell padding='checkbox' />
              {columns.map((column) => (
                <TableCell key={column.id}>
                  {column.sortable ? (
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? order : 'asc'}
                      onClick={createSortHandler(column.id)}
                    >
                      <Typography
                        variant='bodySmall'
                        sx={{
                          fontWeight: 500,
                          fontFamily: 'Inter',
                          textTransform: 'uppercase',
                        }}
                      >
                        {column.label}
                      </Typography>
                    </TableSortLabel>
                  ) : (
                    <Typography
                      variant='bodySmall'
                      sx={{
                        fontWeight: 500,
                        fontFamily: 'Inter',
                        textTransform: 'uppercase',
                      }}
                    >
                      {column.label}
                    </Typography>
                  )}
                </TableCell>
              ))}
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
