import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import * as Lingui from '@lingui/core'

import PersonIdentityCard from './PersonIdentityCard'
import { Person } from '@/types/Person'
import { PersonIdentifier } from '@/types/PersonIdentifier'
import { PersonMembership } from '@/types/PersonMembership'
import { PersonEmployment } from '@/types/PersonEmployment'
import { IAgent } from '@/types/IAgent'
import {
  OrganizationCategory,
  OrganizationGenericType,
  PersonIdentifierType,
} from '@prisma/client'
import { OrganizationUnit } from '@/types/OrganizationUnit'
import { Literal } from '@/types/Literal'
import { useSession } from 'next-auth/react'
import { makeAssignment, makeAuthzContext } from '@/app/auth/context'
import { PermissionAction, PermissionSubject } from '@/types/Permission'
import { EntityType } from '@/types/UserRoleScope'

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({ data: null })),
}))

jest.mock('next/navigation', () => ({
  usePathname: () => '/en/dashboard',
  useSearchParams: () => ({
    toString: () => 'foo=bar',
  }),
}))

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} />
  ),
}))

// Forwards the ref like the real Link (MUI Link passes one) and drops the
// Next-only `scroll` prop before it reaches the DOM.
jest.mock('next/link', () => {
  const MockLink = React.forwardRef<
    HTMLAnchorElement,
    { href: string; children: React.ReactNode; scroll?: boolean }
  >(({ href, children, ...rest }, ref) => {
    const anchorProps: Record<string, unknown> = { ...rest }
    delete anchorProps.scroll
    return (
      <a ref={ref} href={href} {...anchorProps}>
        {children}
      </a>
    )
  })
  MockLink.displayName = 'MockLink'
  return { __esModule: true, default: MockLink }
})

// ---------- MUI theme mock ----------
jest.mock('@mui/material/styles', () => ({
  ...jest.requireActual('@mui/material/styles'),
  useTheme: () => ({
    palette: {
      primary: { main: '#1976d2', contrastText: '#fff' },
      text: { secondary: '#666' },
      divider: '#ddd',
      action: { hover: '#f5f5f5', selected: '#eee' },
    },
    utils: { pxToRem: (v: number) => `${v / 16}rem` },
    typography: { fontWeightRegular: 400, fontWeightMedium: 500 },
  }),
}))

// ---------- helpers ----------
const mkPerson = (): Person => {
  const identifiers = [
    new PersonIdentifier(
      PersonIdentifierType.idhals,
      'violaine-sebillotte-cuchet',
    ),
    new PersonIdentifier(PersonIdentifierType.orcid, '0009-0005-6080-0215'),
    new PersonIdentifier(PersonIdentifierType.idref, '02725030X'),
    // not displayed
    new PersonIdentifier(PersonIdentifierType.eppn, 'john.doe@univ.fr'),
  ]

  const memberships: PersonMembership[] = [
    {
      organizationUnit: {
        uid: 'rs1',
        acronym: 'IRJS',
        slug: 'irjs',
        category: OrganizationCategory.research_unit,
      },
    } as PersonMembership,
  ]

  return new Person(
    'p1',
    false,
    null,
    'Pascal Renard',
    'Pascal',
    'Renard',
    identifiers,
    memberships,
    'person',
    'pascal-renard',
  )
}

const mkEmployment = (
  {
    slug = 'up1' as string | null,
    names = [
      Literal.fromObject({ value: 'Université Paris 1', language: 'fr' }),
      Literal.fromObject({ value: 'Paris 1 University', language: 'en' }),
    ],
    hiddenEffective = false,
  } = {},
  positionCode: string | null = 'MCF',
  endDate: string | null = null,
): PersonEmployment =>
  new PersonEmployment(
    new OrganizationUnit(
      'inst1',
      'UP1',
      names,
      [],
      OrganizationCategory.institution,
      OrganizationGenericType.institution,
      null,
      [],
      slug,
      false,
      [],
      false,
      hiddenEffective,
    ),
    null,
    endDate,
    positionCode,
  )

// Session of a user holding account_editor scoped to the given research unit
const mockAccountEditorSession = (researchUnitUid: string) => {
  ;(useSession as jest.Mock).mockReturnValue({
    data: {
      user: {
        authz: makeAuthzContext({
          personUid: 'editor-uid',
          roleAssignments: [
            makeAssignment(
              'account_editor',
              [
                {
                  action: PermissionAction.update,
                  subject: PermissionSubject.Person,
                  fields: ['identifiers'],
                },
              ],
              [
                {
                  entityType: EntityType.ResearchUnit,
                  entityUid: researchUnitUid,
                },
              ],
            ),
          ],
        }),
      },
    },
  })
}

// ---------- tests ----------
describe('PersonIdentityCard', () => {
  beforeEach(() => {
    ;(useSession as jest.Mock).mockReturnValue({ data: null })
    Lingui.i18n.activate('en')
  })

  it('renders initials and display name', () => {
    const person = mkPerson()

    render(<PersonIdentityCard person={person} />)

    expect(screen.getByText('PR')).toBeInTheDocument()
    expect(screen.getByText('Pascal Renard')).toBeInTheDocument()
  })

  it('links the research unit acronym to its perspective', () => {
    const person = mkPerson()

    render(<PersonIdentityCard person={person} />)

    expect(screen.getByRole('link', { name: 'IRJS' })).toHaveAttribute(
      'href',
      '/en/dashboard?foo=bar&perspective=irjs',
    )
  })

  it('renders the position and employer of the first employment', () => {
    const person = mkPerson()
    person.employments = [
      mkEmployment(),
      mkEmployment({ slug: 'other', names: [] }, 'PR'),
    ]

    render(<PersonIdentityCard person={person} />)

    expect(screen.getByText('Maître de conférences')).toBeInTheDocument()
    expect(screen.queryByText('Professeur')).not.toBeInTheDocument()

    expect(
      screen.getByRole('link', { name: 'Paris 1 University' }),
    ).toHaveAttribute('href', '/en/dashboard?foo=bar&perspective=up1')
  })

  it('renders the employer as plain text when it has no slug', () => {
    const person = mkPerson()
    person.employments = [mkEmployment({ slug: null })]

    render(<PersonIdentityCard person={person} />)

    expect(screen.getByText('Paris 1 University')).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Paris 1 University' }),
    ).not.toBeInTheDocument()
  })

  it('does not name a hidden employer but keeps the position', () => {
    const person = mkPerson()
    person.employments = [mkEmployment({ hiddenEffective: true })]

    render(<PersonIdentityCard person={person} />)

    expect(screen.getByText('Maître de conférences')).toBeInTheDocument()
    expect(screen.queryByText('Paris 1 University')).not.toBeInTheDocument()
  })

  it('skips ended employments', () => {
    const person = mkPerson()
    person.employments = [
      mkEmployment({ names: [] }, 'PR', new Date(2000, 0, 1).toDateString()),
      mkEmployment({}, 'MCF', new Date(2999, 11, 31).toDateString()),
    ]

    render(<PersonIdentityCard person={person} />)

    expect(screen.queryByText('Professeur')).not.toBeInTheDocument()
    expect(screen.queryByText('UP1')).not.toBeInTheDocument()
    expect(screen.getByText('Maître de conférences')).toBeInTheDocument()
    expect(screen.getByText('Paris 1 University')).toBeInTheDocument()
  })

  it('shows neither position nor employer when every employment has ended', () => {
    const person = mkPerson()
    person.employments = [
      mkEmployment({}, 'MCF', new Date(2000, 0, 1).toDateString()),
    ]

    render(<PersonIdentityCard person={person} />)

    expect(screen.queryByText('Maître de conférences')).not.toBeInTheDocument()
    expect(screen.queryByText('Paris 1 University')).not.toBeInTheDocument()
  })

  it('renders only preset identifiers with correct links', () => {
    const person = mkPerson()

    render(<PersonIdentityCard person={person} />)

    expect(screen.getByText('violaine-sebillotte-cuchet')).toBeInTheDocument()
    expect(screen.getByText('0009-0005-6080-0215')).toBeInTheDocument()
    expect(screen.getByText('02725030X')).toBeInTheDocument()

    // filtered out
    expect(screen.queryByText('john.doe@univ.fr')).not.toBeInTheDocument()

    expect(
      screen.getByText('02725030X').closest('a')?.getAttribute('href'),
    ).toBe('https://www.idref.fr/02725030X')
  })

  it('hides the edit account button without the account_editor right', () => {
    render(<PersonIdentityCard person={mkPerson()} />)

    expect(
      screen.queryByRole('link', { name: 'edit_account_tooltip' }),
    ).not.toBeInTheDocument()
  })

  it('links to the account page when the user can edit the person identifiers', () => {
    mockAccountEditorSession('rs1')

    render(<PersonIdentityCard person={mkPerson()} />)

    expect(
      screen
        .getByRole('link', { name: 'edit_account_tooltip' })
        .getAttribute('href'),
    ).toBe('/en/account?perspective=pascal-renard')
  })

  it('hides the edit account button when the right is scoped elsewhere', () => {
    mockAccountEditorSession('other-unit')

    render(<PersonIdentityCard person={mkPerson()} />)

    expect(
      screen.queryByRole('link', { name: 'edit_account_tooltip' }),
    ).not.toBeInTheDocument()
  })

  it('throws if a non-Person agent is provided', () => {
    const notPerson = { type: 'institution' } as IAgent

    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<PersonIdentityCard person={notPerson} />)).toThrow(
      'PersonIdentityCard: agent is not a Person',
    )

    spy.mockRestore()
  })
})
