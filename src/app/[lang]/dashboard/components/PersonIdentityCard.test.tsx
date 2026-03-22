import '@testing-library/jest-dom'
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import * as Lingui from '@lingui/core'

import PersonIdentityCard from './PersonIdentityCard'
import { Person } from '@/types/Person'
import { PersonIdentifier } from '@/types/PersonIdentifier'
import { PersonMembership } from '@/types/PersonMembership'
import { IAgent } from '@/types/IAgent'
import { PersonIdentifierType } from '@prisma/client'

const pushMock = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
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

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string
    children: React.ReactNode
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

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
      researchUnit: {
        uid: 'rs1',
        acronym: 'IRJS',
        slug: 'irjs',
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

// ---------- tests ----------
describe('PersonIdentityCard', () => {
  beforeEach(() => {
    pushMock.mockClear()
    Lingui.i18n.activate('en')
  })

  it('renders initials and display name', () => {
    const person = mkPerson()

    render(<PersonIdentityCard person={person} />)

    expect(screen.getByText('PR')).toBeInTheDocument()
    expect(screen.getByText('Pascal Renard')).toBeInTheDocument()
  })

  it('renders research unit acronym and navigates on click', () => {
    const person = mkPerson()

    render(<PersonIdentityCard person={person} />)

    const acronym = screen.getByText('IRJS')
    fireEvent.click(acronym)

    expect(pushMock).toHaveBeenCalledWith(
      '/en/dashboard?foo=bar&perspective=irjs',
      { scroll: false },
    )
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

  it('throws if a non-Person agent is provided', () => {
    const notPerson = { type: 'institution' } as IAgent

    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<PersonIdentityCard person={notPerson} />)).toThrow(
      'PersonIdentityCard: agent is not a Person',
    )

    spy.mockRestore()
  })
})
