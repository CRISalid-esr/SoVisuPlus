import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import React, { ReactElement } from 'react'

import useStore from '@/stores/global_store'
import { useSession } from 'next-auth/react'

import Type from './Type'
import { Document, DocumentState, DocumentType } from '@/types/Document'
import { Literal } from '@/types/Literal'
import { abilityFromAuthzContext } from '@/app/auth/ability'
import { makeAssignment, makeAuthzContext } from '@/app/auth/context'
import { PermissionAction, PermissionSubject } from '@/types/Permission'
import { Contribution } from '@/types/Contribution'
import { InternalPerson } from '@/types/InternalPerson'
import { LocRelator } from '@/types/LocRelator'
import userEvent from '@testing-library/user-event'

jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('next-auth/react', () => ({
  __esModule: true,
  useSession: jest.fn(),
}))

const renderWithI18n = (ui: ReactElement) =>
  render(<I18nProvider i18n={i18n}>{ui}</I18nProvider>)

const makeDoc = (type: DocumentType) =>
  new Document(
    'doc-xyz',
    type,
    '2024',
    new Date('2024-01-01T00:00:00.000Z'),
    new Date('2024-12-31T23:59:59.000Z'),
    [new Literal('Title', 'en')],
    [],
    [],
    [
      new Contribution(
        new InternalPerson('local-me', null, 'local-me', 'First', 'Last', []),
        [LocRelator.AUTHOR],
      ),
    ],
    [],
    DocumentState.default,
  )

const allowDocTypeUpdateCtx = makeAuthzContext({
  roleAssignments: [
    makeAssignment(
      'document_editor',
      [
        {
          action: PermissionAction.update,
          subject: PermissionSubject.Document,
          fields: [
            'titles',
            'abstracts',
            'contributors',
            'identifiers',
            'documentType',
          ],
        },
      ],
      [{ entityType: 'Person', entityUid: 'local-me' }],
    ),
  ],
})

const denyDocTypeUpdateCtx = makeAuthzContext({
  roleAssignments: [
    makeAssignment(
      'document_editor',
      [
        {
          action: PermissionAction.update,
          subject: PermissionSubject.Document,
          fields: ['titles', 'abstracts', 'contributors', 'identifiers'], // without documentType
        },
      ],
      [{ entityType: 'Person', entityUid: 'local-me' }],
    ),
  ],
})

describe('Type component (document type editor)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows current type and allows editing when user has document_editor for documentType', async () => {
    const updateDocumentType = jest.fn()
    const selectedDocument = makeDoc(DocumentType.JournalArticle)

    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        document: {
          selectedDocument,
          updateDocumentType,
        },
      }),
    )
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { authz: allowDocTypeUpdateCtx } },
    })

    expect(() => abilityFromAuthzContext(allowDocTypeUpdateCtx)).not.toThrow()

    renderWithI18n(<Type />)

    expect(
      screen.getByRole('button', {
        name: /document_details_page_type_edit_button/i,
      }),
    ).toBeEnabled()

    fireEvent.click(
      screen.getByRole('button', {
        name: /document_details_page_type_edit_button/i,
      }),
    )

    const tree = screen.getByRole('tree')
    const allItems = within(tree).getAllByRole('treeitem')
    const target = allItems.find((el) => {
      console.log(el.textContent)
      return el.textContent
        ?.toLowerCase()
        .includes('documents_page_book_chapter_icon_label')
    })
    expect(target).toBeDefined()

    const input = (target as HTMLElement).querySelector(
      'input[type="checkbox"]',
    )
    expect(input).toBeTruthy()

    await userEvent.click(input as HTMLInputElement)

    const applyBtn = screen.getByRole('button', {
      name: /document_details_page_apply_button/i,
    })
    expect(applyBtn).toBeEnabled()

    fireEvent.click(applyBtn)

    expect(updateDocumentType).toHaveBeenCalledTimes(1)
    const calledWith = updateDocumentType.mock.calls[0][0]
    expect(Object.values(DocumentType)).toContain(calledWith)
    expect(calledWith).not.toBe(DocumentType.Book)
  })

  it('disables editing when user lacks update permission for documentType', () => {
    const updateDocumentType = jest.fn()
    const selectedDocument = makeDoc(DocumentType.JournalArticle)

    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        document: {
          selectedDocument,
          updateDocumentType,
        },
      }),
    )
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { authz: denyDocTypeUpdateCtx } },
    })

    renderWithI18n(<Type />)

    const editBtn = screen.getByRole('button', { name: /edit/i })
    expect(editBtn).toBeDisabled()

    // Clicking does nothing
    fireEvent.click(editBtn)
    expect(screen.queryByRole('tree')).not.toBeInTheDocument()
    expect(updateDocumentType).not.toHaveBeenCalled()
  })
})
