import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'

import AgentIdentityCard from './AgentIdentityCard'
import { Person } from '@/types/Person'
import { PersonIdentifier } from '@/types/PersonIdentifier'
import { ResearchStructure } from '@/types/ResearchStructure'
import type { PersonMembership } from '@/types/PersonMembership'
import type { Literal } from '@/types/Literal'
import type { IAgent } from '@/types/IAgent'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { PersonIdentifierType } from '@prisma/client'

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

jest.mock(
  '@/[lang]/dashboard/components/ResearchStructureIdentityCard',
  () => ({
    __esModule: true,
    default: ({
      researchStructure,
    }: {
      researchStructure: ResearchStructure
    }) => <div data-testid='rs-identity-card'>{researchStructure.uid}</div>,
  }),
)

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

const makeResearchStructure = (): ResearchStructure => {
  const names: Literal[] = []
  const descriptions: Literal[] = []
  return new ResearchStructure(
    'rs1',
    'IRJS',
    names,
    descriptions,
    'Institut de Recherche Juridique de la Sorbonne',
    [],
    'research_structure',
    'irjs',
    false,
  )
}

const makeUnsupportedAgent = (): IAgent => {
  // minimal IAgent instance (not a Person nor ResearchStructure)
  return {
    uid: 'inst1',
    slug: 'univ-x',
    type: 'institution',
    membershipAcronyms: [],
    membershipSignatures: [],
    getDisplayName: () => 'Université X',
  }
}

describe('AgentIdentityCard', () => {
  it('renders PersonIdentityCard when agent is a Person', () => {
    const person = makePerson()

    render(<AgentIdentityCard agent={person} />)

    expect(screen.getByTestId('person-identity-card')).toBeInTheDocument()
    expect(screen.queryByTestId('rs-identity-card')).not.toBeInTheDocument()
    expect(
      screen.queryByText(
        'dashboard_page_agent_identity_card_no_agent_selected',
      ),
    ).not.toBeInTheDocument()
  })

  it('renders ResearchStructureIdentityCard when agent is a ResearchStructure', () => {
    const rs = makeResearchStructure()

    render(<AgentIdentityCard agent={rs} />)

    expect(screen.getByTestId('rs-identity-card')).toBeInTheDocument()
    expect(screen.queryByTestId('person-identity-card')).not.toBeInTheDocument()
    expect(
      screen.queryByText(
        'dashboard_page_agent_identity_card_no_agent_selected',
      ),
    ).not.toBeInTheDocument()
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
    expect(screen.queryByTestId('rs-identity-card')).not.toBeInTheDocument()
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
    expect(screen.queryByTestId('rs-identity-card')).not.toBeInTheDocument()
  })
})
