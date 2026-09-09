import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OrganizationCategory } from '@prisma/client'
import { StructureRow } from './directoryRows'
import StructureDetail from './StructureDetail'

// The members table fetches from the store; the header controls are under test.
jest.mock('./StructureMembersTable', () => ({
  __esModule: true,
  default: () => <div data-testid='members' />,
}))

const row = (overrides: Partial<StructureRow> = {}): StructureRow =>
  ({
    uid: 'local-lab',
    slug: 'lab',
    acronym: 'LAB',
    name: 'Laboratory',
    category: OrganizationCategory.research_unit,
    nationalType: null,
    external: false,
    hidden: false,
    hiddenEffective: false,
    institutionNames: [],
    membersCount: 0,
    publicationsCount: 0,
    oaRate: 0,
    halRate: 0,
    parents: [],
    ...overrides,
  }) as StructureRow

const renderDetail = (
  props: Partial<React.ComponentProps<typeof StructureDetail>> = {},
) =>
  render(
    <StructureDetail
      row={row()}
      onNavigate={jest.fn()}
      onSelectChild={jest.fn()}
      {...props}
    />,
  )

const toggle = () => screen.queryByRole('switch')

describe('StructureDetail visibility toggle', () => {
  it('is absent without the structure_manager permission', () => {
    renderDetail({ onToggleHidden: jest.fn() })
    expect(toggle()).not.toBeInTheDocument()
  })

  it('is absent when no handler is wired, even with the permission', () => {
    renderDetail({ canManageVisibility: true })
    expect(toggle()).not.toBeInTheDocument()
  })

  it('reports the current visibility and hides the structure on click', async () => {
    const onToggleHidden = jest.fn()
    renderDetail({ canManageVisibility: true, onToggleHidden })

    expect(toggle()).not.toBeChecked()
    await userEvent.click(toggle()!)
    expect(onToggleHidden).toHaveBeenCalledWith('local-lab', true)
  })

  it('reports the bare uid of a duplicated node, not its tree node id', async () => {
    // Under a root, a non-root node carries a `uid@@rootUid` id; the API only
    // knows the bare uid.
    const onToggleHidden = jest.fn()
    renderDetail({
      row: row({ uid: 'local-lab@@local-univ', originalUid: 'local-lab' }),
      canManageVisibility: true,
      onToggleHidden,
    })

    await userEvent.click(toggle()!)
    expect(onToggleHidden).toHaveBeenCalledWith('local-lab', true)
  })

  it('shows an explicitly hidden structure as on, and can show it again', async () => {
    const onToggleHidden = jest.fn()
    renderDetail({
      row: row({ hidden: true, hiddenEffective: true }),
      canManageVisibility: true,
      onToggleHidden,
    })

    expect(toggle()).toBeChecked()
    expect(toggle()).toBeEnabled()
    await userEvent.click(toggle()!)
    expect(onToggleHidden).toHaveBeenCalledWith('local-lab', false)
  })

  it('is disabled for a structure hidden through its ancestors', () => {
    renderDetail({
      row: row({ hidden: false, hiddenEffective: true }),
      canManageVisibility: true,
      onToggleHidden: jest.fn(),
    })

    expect(toggle()).toBeChecked()
    expect(toggle()).toBeDisabled()
  })
})
