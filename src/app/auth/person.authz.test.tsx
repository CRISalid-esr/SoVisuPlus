// file: src/app/auth/person.authz.test.tsx
import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Can } from '@casl/react'

import { abilityFromAuthzContext } from '@/app/auth/ability'
import { PermissionAction, PermissionSubject } from '@/types/Permission'
import { makeAssignment, makeAuthzContext } from '@/app/auth/context'

/** Minimal Authorizable "Person" for CASL (no DB needed) */
const makeAuthzPerson = (uid: string, rsUids: string[] = []) => ({
  authzProperties: {
    __type: PermissionSubject.Person,
    perimeter: {
      Person: [uid],
      ResearchStructure: rsUids,
    },
  },
})

describe('<Can /> + CASL on Person (fetch_documents)', () => {
  test('renders when user has Person-scoped fetch_documents on that person', () => {
    const ctx = makeAuthzContext({
      roleAssignments: [
        makeAssignment(
          'document_fetcher',
          [
            {
              action: PermissionAction.fetch_documents,
              subject: PermissionSubject.Person,
            },
          ],
          [{ entityType: 'Person', entityUid: 'local-me' }],
        ),
      ],
    })

    const ability = abilityFromAuthzContext(ctx)
    const person = makeAuthzPerson('local-me')

    render(
      <Can I={PermissionAction.fetch_documents} this={person} ability={ability}>
        <span data-testid='ok'>OK</span>
      </Can>,
    )

    expect(screen.getByTestId('ok')).toBeInTheDocument()
  })

  test('does not render for out-of-scope person', () => {
    const ctx = makeAuthzContext({
      roleAssignments: [
        makeAssignment(
          'document_fetcher',
          [
            {
              action: PermissionAction.fetch_documents,
              subject: PermissionSubject.Person,
            },
          ],
          [{ entityType: 'Person', entityUid: 'local-me' }],
        ),
      ],
    })

    const ability = abilityFromAuthzContext(ctx)
    const other = makeAuthzPerson('someone-else')

    render(
      <Can I={PermissionAction.fetch_documents} this={other} ability={ability}>
        <span data-testid='ok'>OK</span>
      </Can>,
    )

    expect(screen.queryByTestId('ok')).not.toBeInTheDocument()
  })

  test('RS-scoped fetcher can fetch for people in that RS perimeter', () => {
    const ctx = makeAuthzContext({
      roleAssignments: [
        makeAssignment(
          'document_fetcher',
          [
            {
              action: PermissionAction.fetch_documents,
              subject: PermissionSubject.Person,
            },
          ],
          [{ entityType: 'ResearchStructure', entityUid: 'RS-42' }],
        ),
      ],
    })

    const ability = abilityFromAuthzContext(ctx)
    const personInRs = makeAuthzPerson('local-alice', ['RS-42'])
    const personOutRs = makeAuthzPerson('local-bob', ['RS-99'])

    // in
    render(
      <Can
        I={PermissionAction.fetch_documents}
        this={personInRs}
        ability={ability}
      >
        <span data-testid='ok-in'>OK-IN</span>
      </Can>,
    )
    expect(screen.getByTestId('ok-in')).toBeInTheDocument()

    // out
    render(
      <Can
        I={PermissionAction.fetch_documents}
        this={personOutRs}
        ability={ability}
      >
        <span data-testid='ok-out'>OK-OUT</span>
      </Can>,
    )
    expect(screen.queryByTestId('ok-out')).not.toBeInTheDocument()
  })

  test('global fetcher (no scopes) works with subject name via "a" prop', () => {
    const ctx = makeAuthzContext({
      roleAssignments: [
        makeAssignment('document_fetcher', [
          {
            action: PermissionAction.fetch_documents,
            subject: PermissionSubject.Person,
          },
        ]), // no scopes -> global
      ],
    })

    const ability = abilityFromAuthzContext(ctx)

    render(
      <Can
        I={PermissionAction.fetch_documents}
        a={PermissionSubject.Person}
        ability={ability}
      >
        <span data-testid='ok'>OK</span>
      </Can>,
    )

    expect(screen.getByTestId('ok')).toBeInTheDocument()
  })

  test('passThrough gives boolean to child function (enabled when allowed)', () => {
    const ctx = makeAuthzContext({
      roleAssignments: [
        makeAssignment(
          'document_fetcher',
          [
            {
              action: PermissionAction.fetch_documents,
              subject: PermissionSubject.Person,
            },
          ],
          [{ entityType: 'Person', entityUid: 'local-me' }],
        ),
      ],
    })

    const ability = abilityFromAuthzContext(ctx)
    const person = makeAuthzPerson('local-me')

    render(
      <Can
        I={PermissionAction.fetch_documents}
        this={person}
        passThrough
        ability={ability}
      >
        {(allowed: boolean) => (
          <button data-testid='btn' disabled={!allowed}>
            Fetch
          </button>
        )}
      </Can>,
    )

    const btn = screen.getByTestId('btn') as HTMLButtonElement
    expect(btn).toBeEnabled()
  })
})
