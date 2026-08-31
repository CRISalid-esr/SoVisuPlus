import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OrganizationCategory } from '@prisma/client'
import { StructureRow } from './directoryRows'
import StructureTreeExplorer from './StructureTreeExplorer'

const replace = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: (...args: unknown[]) => replace(...args) }),
  usePathname: () => '/fr/research-structures',
  useSearchParams: () => new URLSearchParams(),
}))

// The detail panel fetches members; the tree is what is under test here.
jest.mock('./StructureDetail', () => ({
  __esModule: true,
  default: ({ row }: { row: StructureRow }) => (
    <div data-testid='detail'>{row.uid}</div>
  ),
}))

const entry = (
  uid: string,
  category: OrganizationCategory,
  parentUid?: string,
): StructureRow =>
  ({
    uid,
    slug: null,
    acronym: uid,
    name: uid,
    category,
    nationalType: null,
    external: false,
    institutionNames: [],
    membersCount: 0,
    publicationsCount: 0,
    oaRate: 0,
    halRate: 0,
    parents: parentUid
      ? [{ parentUid, kind: 'part_of', position: null }]
      : [],
  }) as unknown as StructureRow

// inst ─ bu (support_unit) ─ lab (research_unit)
const data: StructureRow[] = [
  entry('inst', OrganizationCategory.institution),
  entry('bu', OrganizationCategory.support_unit, 'inst'),
  entry('lab', OrganizationCategory.research_unit, 'inst'),
]

const renderTree = () =>
  render(
    <StructureTreeExplorer
      data={data}
      includeExternal={false}
      onNavigate={jest.fn()}
    />,
  )

/**
 * A parent treeitem's accessible name includes its descendants' text, so match
 * on the label element itself and walk back up to the item.
 */
const item = (label: string): HTMLElement =>
  screen
    .getByText(label, { selector: '.MuiTreeItem-label' })
    .closest('[role="treeitem"]') as HTMLElement

const labelOf = (label: string) =>
  screen.getByText(label, { selector: '.MuiTreeItem-label' })

/** Expansion is triggered by the chevron only (expansionTrigger='iconContainer'). */
const chevronOf = (node: HTMLElement) =>
  node.querySelector('.MuiTreeItem-iconContainer') as HTMLElement

const LIBRARIES = 'research_structures_group_libraries'
const TEACHING = 'research_structures_group_teaching_research'
const SERVICES = 'research_structures_group_general_services'

describe('StructureTreeExplorer group headers', () => {
  it('renders the institution children behind group headers', async () => {
    const user = userEvent.setup()
    renderTree()
    await user.click(chevronOf(item('inst')))

    expect(item(TEACHING)).toBeInTheDocument()
    expect(item(LIBRARIES)).toBeInTheDocument()
    // groups with no member are not rendered
    expect(screen.queryByText(SERVICES)).not.toBeInTheDocument()
  })

  it('expands on a label click without selecting or touching the URL', async () => {
    const user = userEvent.setup()
    renderTree()
    await user.click(chevronOf(item('inst')))
    replace.mockClear()

    const group = item(LIBRARIES)
    await user.click(labelOf(LIBRARIES))

    expect(group).toHaveAttribute('aria-expanded', 'true')
    expect(item('bu')).toBeInTheDocument()
    // a group is not a structure: the selection and the URL stay where they
    // were (here on "inst", selected by the chevron click above)
    expect(replace).not.toHaveBeenCalled()
    expect(screen.getByTestId('detail')).toHaveTextContent('inst')
    expect(item(LIBRARIES)).toHaveAttribute('aria-selected', 'false')
  })

  it('toggles exactly once on a chevron click', async () => {
    const user = userEvent.setup()
    renderTree()
    await user.click(chevronOf(item('inst')))

    const group = item(LIBRARIES)
    const chevron = chevronOf(group)

    // The icon-container click also reaches the content handler, which fires a
    // selection. Without stopping propagation the group would toggle twice and
    // the chevron would look dead.
    await user.click(chevron)
    expect(group).toHaveAttribute('aria-expanded', 'true')

    await user.click(chevron)
    expect(group).toHaveAttribute('aria-expanded', 'false')
  })

  it('still selects a real structure', async () => {
    const user = userEvent.setup()
    renderTree()
    await user.click(chevronOf(item('inst')))
    await user.click(labelOf(LIBRARIES))
    replace.mockClear()

    await user.click(labelOf('bu'))

    expect(replace).toHaveBeenCalledWith(
      '/fr/research-structures?structure=bu',
      { scroll: false },
    )
    expect(screen.getByTestId('detail')).toHaveTextContent('bu')
  })
})

describe('StructureTreeExplorer panel resizer', () => {
  it('exposes a keyboard-resizable separator persisted in localStorage', async () => {
    const user = userEvent.setup()
    renderTree()
    const separator = screen.getByRole('separator')

    expect(separator).toHaveAttribute('aria-valuenow', '360')

    separator.focus()
    await user.keyboard('{ArrowRight}')
    expect(separator).toHaveAttribute('aria-valuenow', '376')

    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(separator).toHaveAttribute('aria-valuenow', '344')
    expect(localStorage.getItem('structures-tree-panel-width')).toBe('344')
  })

  it('restores the stored width on mount, clamped to the allowed range', () => {
    localStorage.setItem('structures-tree-panel-width', '5000')
    renderTree()
    expect(screen.getByRole('separator')).toHaveAttribute(
      'aria-valuenow',
      '720',
    )
  })
})
