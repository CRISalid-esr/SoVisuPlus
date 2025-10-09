import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Can } from '@casl/react'

import { abilityFromAuthzContext } from '@/app/auth/ability'
import { PermissionAction, PermissionSubject } from '@/types/Permission'
import { makeAssignment, makeAuthzContext } from '@/app/auth/context'

import { Document, DocumentType } from '@/types/Document'
import { Literal } from '@/types/Literal'
import { Contribution } from '@/types/Contribution'
import { LocRelator } from '@/types/LocRelator'
import { InternalPerson } from '@/types/InternalPerson'

const makeDocByContribUids = (uid: string, contributorUids: string[]) =>
  new Document(
    uid,
    DocumentType.JournalArticle,
    '2023-12-31',
    new Date('2023-12-31'),
    new Date('2023-12-31'),
    [new Literal(`Title ${uid}`, 'en')],
    [],
    [],
    contributorUids.map(
      (puid) =>
        new Contribution(
          new InternalPerson(puid, null, puid, 'First', 'Last', []),
          [LocRelator.AUTHOR],
        ),
    ),
    [],
  )

describe('<Can /> + CASL with real Document instances', () => {
  test('renders for allowed merge on in-scope document', () => {
    const ctx = makeAuthzContext({
      roleAssignments: [
        makeAssignment(
          'document_merger',
          [
            {
              action: PermissionAction.merge,
              subject: PermissionSubject.Document,
            },
          ],
          [{ entityType: 'Person', entityUid: 'local-me' }],
        ),
      ],
    })
    const ability = abilityFromAuthzContext(ctx)
    const doc = makeDocByContribUids('doc-in', ['local-me'])

    render(
      <Can I={PermissionAction.merge} this={doc} ability={ability}>
        <span data-testid='ok'>OK</span>
      </Can>,
    )

    expect(screen.getByTestId('ok')).toBeInTheDocument()
  })

  test('does not render for out-of-scope document', () => {
    const ctx = makeAuthzContext({
      roleAssignments: [
        makeAssignment(
          'document_merger',
          [
            {
              action: PermissionAction.merge,
              subject: PermissionSubject.Document,
            },
          ],
          [{ entityType: 'Person', entityUid: 'local-me' }],
        ),
      ],
    })
    const ability = abilityFromAuthzContext(ctx)
    const doc = makeDocByContribUids('doc-out', ['someone-else'])

    render(
      <Can I={PermissionAction.merge} this={doc} ability={ability}>
        <span data-testid='ok'>OK</span>
      </Can>,
    )

    expect(screen.queryByTestId('ok')).not.toBeInTheDocument()
  })

  test('field-level update: allowed for listed field, denied for others', () => {
    const ctx = makeAuthzContext({
      roleAssignments: [
        makeAssignment(
          'document_editor',
          [
            {
              action: PermissionAction.update,
              subject: PermissionSubject.Document,
              fields: ['titles', 'identifiers'],
            },
          ],
          [{ entityType: 'Person', entityUid: 'local-me' }],
        ),
      ],
    })
    const ability = abilityFromAuthzContext(ctx)
    const doc = makeDocByContribUids('doc-edit', ['local-me'])

    const { rerender } = render(
      <Can
        I={PermissionAction.update}
        this={doc}
        field='titles'
        ability={ability}
      >
        <span data-testid='allowed'>ALLOWED</span>
      </Can>,
    )
    expect(screen.getByTestId('allowed')).toBeInTheDocument()

    rerender(
      <Can
        I={PermissionAction.update}
        this={doc}
        field='pages'
        ability={ability}
      >
        <span data-testid='denied'>DENIED</span>
      </Can>,
    )
    expect(screen.queryByTestId('denied')).not.toBeInTheDocument()
  })

  test('"not" renders when user cannot perform action', () => {
    const ctx = makeAuthzContext({
      roleAssignments: [
        makeAssignment(
          'document_merger',
          [
            {
              action: PermissionAction.merge,
              subject: PermissionSubject.Document,
            },
          ],
          [{ entityType: 'Person', entityUid: 'local-me' }],
        ),
      ],
    })
    const ability = abilityFromAuthzContext(ctx)
    const doc = makeDocByContribUids('doc-out2', ['someone-else'])

    render(
      <Can not I={PermissionAction.merge} this={doc} ability={ability}>
        <span data-testid='msg'>You are not allowed</span>
      </Can>,
    )

    expect(screen.getByTestId('msg')).toBeInTheDocument()
  })

  test('passThrough provides boolean to child function', () => {
    const ctx = makeAuthzContext({
      roleAssignments: [
        makeAssignment(
          'document_merger',
          [
            {
              action: PermissionAction.merge,
              subject: PermissionSubject.Document,
            },
          ],
          [{ entityType: 'Person', entityUid: 'local-me' }],
        ),
      ],
    })
    const ability = abilityFromAuthzContext(ctx)
    const doc = makeDocByContribUids('doc-pass', ['local-me'])

    render(
      <Can I={PermissionAction.merge} this={doc} passThrough ability={ability}>
        {(allowed: boolean) => (
          <button data-testid='btn' disabled={!allowed}>
            Merge
          </button>
        )}
      </Can>,
    )

    const btn = screen.getByTestId('btn') as HTMLButtonElement
    expect(btn).toBeEnabled()
  })

  test('subject by name ("a" prop) works for global permission', () => {
    const ctx = makeAuthzContext({
      roleAssignments: [
        makeAssignment('document_merger', [
          {
            action: PermissionAction.merge,
            subject: PermissionSubject.Document,
          },
        ]), // no scopes -> global
      ],
    })
    const ability = abilityFromAuthzContext(ctx)

    render(
      <Can
        I={PermissionAction.merge}
        a={PermissionSubject.Document}
        ability={ability}
      >
        <span data-testid='ok'>OK</span>
      </Can>,
    )

    expect(screen.getByTestId('ok')).toBeInTheDocument()
  })
})
