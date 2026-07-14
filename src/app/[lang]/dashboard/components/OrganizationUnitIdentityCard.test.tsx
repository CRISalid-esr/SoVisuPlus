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
  it('displays the local type first, with the national type as secondary mention', () => {
    render(
      <OrganizationUnitIdentityCard
        organizationUnit={makeTeam({
          localTypes: [Literal.fromObject({ value: 'Axe', language: 'fr' })],
          nationalType: 'THEME',
        })}
      />,
    )

    expect(screen.getByText('Axe')).toBeInTheDocument()
    expect(screen.getByText('THEME')).toBeInTheDocument()
  })

  it('falls back to the national type when no local type exists', () => {
    render(
      <OrganizationUnitIdentityCard
        organizationUnit={makeTeam({ nationalType: 'TEAM' })}
      />,
    )

    expect(screen.getByText('TEAM')).toBeInTheDocument()
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
