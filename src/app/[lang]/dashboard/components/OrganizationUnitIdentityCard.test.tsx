import React from 'react'
import { render, screen } from '@testing-library/react'
import OrganizationUnitIdentityCard from './OrganizationUnitIdentityCard'
import { OrganizationUnit } from '@/types/OrganizationUnit'
import { Literal } from '@/types/Literal'
import { OrganizationCategory, OrganizationGenericType } from '@prisma/client'

const makeTeam = ({
  localTypes = [] as Literal[],
  nationalType = null as string | null,
}) =>
  new OrganizationUnit(
    'local-U029_T1',
    null,
    [Literal.fromObject({ value: 'Axe Histoire', language: 'fr' })],
    [],
    OrganizationCategory.team,
    OrganizationGenericType.team,
    nationalType,
    [],
    'org:axe-histoire',
    false,
    localTypes,
  )

describe('OrganizationUnitIdentityCard type chip', () => {
  it('displays the local type first, with the translated national type as secondary mention', () => {
    render(
      <OrganizationUnitIdentityCard
        organizationUnit={makeTeam({
          localTypes: [Literal.fromObject({ value: 'Axe', language: 'fr' })],
          nationalType: 'THEME',
        })}
      />,
    )

    expect(screen.getByText('Axe')).toBeInTheDocument()
    // no catalog is loaded in tests: the translated label renders as its id
    expect(
      screen.getByText('organization_national_type_theme'),
    ).toBeInTheDocument()
    expect(screen.queryByText('THEME')).not.toBeInTheDocument()
  })

  it('falls back to the translated national type when no local type exists', () => {
    render(
      <OrganizationUnitIdentityCard
        organizationUnit={makeTeam({ nationalType: 'TEAM' })}
      />,
    )

    expect(
      screen.getByText('organization_national_type_team'),
    ).toBeInTheDocument()
  })

  it('displays unknown national type codes as-is', () => {
    render(
      <OrganizationUnitIdentityCard
        organizationUnit={makeTeam({ nationalType: 'NEWCODE' })}
      />,
    )

    expect(screen.getByText('NEWCODE')).toBeInTheDocument()
  })

  it('never displays the generic type, and no chip without any type', () => {
    render(<OrganizationUnitIdentityCard organizationUnit={makeTeam({})} />)

    expect(screen.queryByText('team')).not.toBeInTheDocument()
    expect(screen.queryByText('TEAM')).not.toBeInTheDocument()
  })

  it('throws for a person perspective', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const person = { type: 'person' } as never
    expect(() =>
      render(<OrganizationUnitIdentityCard organizationUnit={person} />),
    ).toThrow('agent is not an OrganizationUnit')
  })
})

describe('OrganizationUnitIdentityCard website link', () => {
  const withWebsite = (websiteUrl: string | null) => {
    const team = makeTeam({})
    team.websiteUrl = websiteUrl
    return team
  }

  it('opens the website in a new window', () => {
    render(
      <OrganizationUnitIdentityCard
        organizationUnit={withWebsite('https://www.example.org/axe/')}
      />,
    )

    const link = screen.getByRole('link', { name: 'www.example.org/axe' })
    expect(link).toHaveAttribute('href', 'https://www.example.org/axe/')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('drops credentials from the link', () => {
    render(
      <OrganizationUnitIdentityCard
        organizationUnit={withWebsite('https://alice:secret@www.example.org/')}
      />,
    )

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      'https://www.example.org/',
    )
  })

  it.each([null, 'not a url', 'javascript:alert(1)'])(
    'shows no link for %p',
    (websiteUrl) => {
      render(
        <OrganizationUnitIdentityCard
          organizationUnit={withWebsite(websiteUrl)}
        />,
      )

      expect(screen.queryByRole('link')).not.toBeInTheDocument()
    },
  )
})
