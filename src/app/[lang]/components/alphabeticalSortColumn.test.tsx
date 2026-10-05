import '@testing-library/jest-dom'
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { MaterialReactTable, useMaterialReactTable } from 'material-react-table'
import { MRT_Localization_FR } from 'material-react-table/locales/fr'
import { alphabeticalSortColumn } from './alphabeticalSortColumn'

jest.mock('@lingui/core/macro', () => ({
  t: (strings: TemplateStringsArray) => strings.join(''),
}))

type Row = { name: string; count: number }

const TestTable = () => {
  const table = useMaterialReactTable<Row>({
    columns: [
      alphabeticalSortColumn<Row>({ accessorKey: 'name', header: 'Name' }),
      { accessorKey: 'count', header: 'Count' },
    ],
    data: [{ name: 'Alice', count: 1 }],
    localization: MRT_Localization_FR,
  })
  return <MaterialReactTable table={table} />
}

// Tests that text columns get alphabetical sorting labels while other
// columns keep the default ascending / descending ones
describe('alphabeticalSortColumn', () => {
  it('uses alphabetical labels in the sort icon tooltip of a text column', () => {
    render(<TestTable />)

    expect(
      screen.getByRole('button', { name: 'table_sort_alphabetical_asc' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Trier par Count décroissant' }),
    ).toBeInTheDocument()
  })

  it('uses alphabetical labels in the column actions menu of a text column', () => {
    render(<TestTable />)

    fireEvent.click(screen.getAllByLabelText('Actions de colonne')[0])

    expect(
      screen.getByRole('menuitem', { name: 'table_sort_alphabetical_asc' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: 'table_sort_alphabetical_desc' }),
    ).toBeInTheDocument()
  })
})
