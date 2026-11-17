import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import {
  MaterialReactTable,
  MRT_SortingState,
  useMaterialReactTable,
} from 'material-react-table'
import { MRT_Localization_FR } from 'material-react-table/locales/fr'
import { sortPriorityColumn } from './sortPriorityColumn'
import { alphabeticalSortColumn } from './alphabeticalSortColumn'

jest.mock('@lingui/core/macro', () => ({
  t: (strings: TemplateStringsArray) => strings.join(''),
}))

type Row = { name: string; count: number; rate: number }

const TestTable = ({ sorting }: { sorting: MRT_SortingState }) => {
  const table = useMaterialReactTable<Row>({
    columns: [
      alphabeticalSortColumn<Row>({ accessorKey: 'name', header: 'Name' }),
      sortPriorityColumn<Row>({ accessorKey: 'count', header: 'Count' }),
      sortPriorityColumn<Row>({ accessorKey: 'rate', header: 'Rate' }),
    ],
    data: [{ name: 'Alice', count: 1, rate: 2 }],
    localization: MRT_Localization_FR,
    state: { sorting },
  })
  return <MaterialReactTable table={table} />
}

// Tests that the sort tooltip mentions the priority of each sorted column
// once several columns are sorted
describe('sortPriorityColumn', () => {
  it('appends the priority to the tooltip of every sorted column', () => {
    render(
      <TestTable
        sorting={[
          { id: 'count', desc: false },
          { id: 'name', desc: true },
        ]}
      />,
    )

    expect(
      screen.getByRole('button', {
        name: 'Trié par Count croissant (table_sort_priority 1)',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'table_sorted_alphabetical_desc (table_sort_priority 2)',
      }),
    ).toBeInTheDocument()
    // an unsorted column keeps its plain "sort by" tooltip (numbers start descending)
    expect(
      screen.getByRole('button', { name: 'Trier par Rate décroissant' }),
    ).toBeInTheDocument()
  })

  it('leaves the tooltip unchanged when a single column is sorted', () => {
    render(<TestTable sorting={[{ id: 'count', desc: true }]} />)

    expect(
      screen.getByRole('button', { name: 'Trié par Count décroissant' }),
    ).toBeInTheDocument()
  })
})
