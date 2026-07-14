import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'

import AgentIdentityCard from './AgentIdentityCard'
import { Person } from '@/types/Person'
import { PersonIdentifier } from '@/types/PersonIdentifier'
import { OrganizationUnit } from '@/types/OrganizationUnit'
import type { PersonMembership } from '@/types/PersonMembership'
import type { Literal } from '@/types/Literal'
import type { AgentType, IAgent } from '@/types/IAgent'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import {
  OrganizationCategory,
  OrganizationGenericType,
  PersonIdentifierType,
} from '@prisma/client'

// Mock Lingui `t` function
jest.mock('@lingui/macro', () => ({
  t: (key: string) => key, // Return key directly for testing
}))

// Mock sub-components
jest.mock('@/[lang]/dashboard/components/PersonIdentityCard', () => ({
  __esModule: true,
  default: ({ person }: { person: Person }) => (
    <div data-testid='person-identity-card'>{person.uid}</div>
  ),
}))

jest.mock('@/[lang]/dashboard/components/OrganizationUnitIdentityCard', () => ({
  __esModule: true,
  default: ({ organizationUnit }: { organizationUnit: OrganizationUnit }) => (
    <div data-testid='org-identity-card'>{organizationUnit.uid}</div>
  ),
}))

const makePerson = (): Person => {
  const identifiers = [
    new PersonIdentifier(PersonIdentifierType.orcid, '0009-0005-6080-0215'),
  ]
  const memberships: PersonMembership[] = []
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

const makeOrganizationUnit = (
  category: OrganizationCategory,
): OrganizationUnit => {
  const names: Literal[] = []
  const descriptions: Literal[] = []
  return new OrganizationUnit(
    'rs1',
    'IRJS',
    names,
    descriptions,
    category,
    OrganizationGenericType.unit,
    null,
    [],
    'org:irjs',
    false,
  )
}

const makeUnsupportedAgent = (): IAgent => {
  // minimal IAgent instance with a type outside the known agent types
  return {
    uid: 'x1',
    slug: 'x1',
    type: 'unknown' as AgentType,
    membershipAcronyms: [],
    membershipSignatures: [],
    getDisplayName: () => 'Unknown Agent',
  }
}

describe('AgentIdentityCard', () => {
  it('renders PersonIdentityCard when agent is a Person', () => {
    const person = makePerson()

    render(<AgentIdentityCard agent={person} />)

    expect(screen.getByTestId('person-identity-card')).toBeInTheDocument()
    expect(screen.queryByTestId('org-identity-card')).not.toBeInTheDocument()
    expect(
      screen.queryByText(
        'dashboard_page_agent_identity_card_no_agent_selected',
      ),
    ).not.toBeInTheDocument()
  })

  it('renders OrganizationUnitIdentityCard when agent is a research unit', () => {
    const rs = makeOrganizationUnit(OrganizationCategory.research_unit)

    render(<AgentIdentityCard agent={rs} />)

    expect(screen.getByTestId('org-identity-card')).toBeInTheDocument()
    expect(screen.queryByTestId('person-identity-card')).not.toBeInTheDocument()
    expect(
      screen.queryByText(
        'dashboard_page_agent_identity_card_no_agent_selected',
      ),
    ).not.toBeInTheDocument()
  })

  it('renders OrganizationUnitIdentityCard for the other organization groups', () => {
    for (const category of [
      OrganizationCategory.institution,
      OrganizationCategory.team,
      OrganizationCategory.support_unit,
    ]) {
      const { unmount } = render(
        <AgentIdentityCard agent={makeOrganizationUnit(category)} />,
      )
      expect(screen.getByTestId('org-identity-card')).toBeInTheDocument()
      unmount()
    }
  })

  it('renders fallback card when agent is null', () => {
    render(
      <I18nProvider i18n={i18n}>
        <AgentIdentityCard agent={null} />
      </I18nProvider>,
    )

    expect(
      screen.getByText('dashboard_page_agent_identity_card_no_agent_selected'),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('person-identity-card')).not.toBeInTheDocument()
    expect(screen.queryByTestId('org-identity-card')).not.toBeInTheDocument()
  })

  it('renders fallback card when agent is an unsupported IAgent type', () => {
    const unsupported = makeUnsupportedAgent()

    render(
      <I18nProvider i18n={i18n}>
        <AgentIdentityCard agent={unsupported} />
      </I18nProvider>,
    )

    expect(
      screen.getByText('dashboard_page_agent_identity_card_no_agent_selected'),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('person-identity-card')).not.toBeInTheDocument()
    expect(screen.queryByTestId('org-identity-card')).not.toBeInTheDocument()
  })
})
