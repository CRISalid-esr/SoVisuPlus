import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import React, { ReactElement } from 'react'

import useStore from '@/stores/global_store'
import { useSession } from 'next-auth/react'
import DateProvider from '@/components/DateProvider'
import PublicationDate from './PublicationDate'
import { Document, DocumentState, DocumentType } from '@/types/Document'
import { Literal } from '@/types/Literal'
import { Contribution } from '@/types/Contribution'
import { InternalPerson } from '@/types/InternalPerson'
import { LocRelator } from '@/types/LocRelator'
import { makeAssignment, makeAuthzContext } from '@/app/auth/context'
import { PermissionAction, PermissionSubject } from '@/types/Permission'
import { formatPublicationDate } from '@/utils/publicationDate'
import { OAStatus } from '@prisma/client'

jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('next-auth/react', () => ({
  __esModule: true,
  useSession: jest.fn(),
}))

const EDIT_BTN = /document_details_page_publication_date_row_edit_button/i
const APPLY_BTN = /document_details_page_apply_button/i
const STEP_YEAR = /document_details_page_publication_date_step_year/i
const STEP_MONTH = /document_details_page_publication_date_step_month/i
const STEP_DAY = /document_details_page_publication_date_step_day/i
const REMOVE_BTN = /document_details_page_publication_date_remove_button/i

const makeDoc = (
  publicationDate: string | null,
  state: DocumentState = DocumentState.default,
) =>
  new Document(
    'doc-xyz',
    DocumentType.JournalArticle,
    OAStatus.GREEN,
    publicationDate,
    null,
    null,
    OAStatus.DIAMOND,
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
    state,
  )

const ctxWithFields = (fields: string[]) =>
  makeAuthzContext({
    roleAssignments: [
      makeAssignment(
        'document_editor',
        [
          {
            action: PermissionAction.update,
            subject: PermissionSubject.Document,
            fields,
          },
        ],
        [{ entityType: 'Person', entityUid: 'local-me' }],
      ),
    ],
  })

const allowCtx = ctxWithFields([
  'titles',
  'abstracts',
  'documentType',
  'publicationDate',
])
const denyCtx = ctxWithFields(['titles', 'abstracts', 'documentType']) // no publicationDate

const setup = ({
  publicationDate,
  state = DocumentState.default,
  authz = allowCtx,
}: {
  publicationDate: string | null
  state?: DocumentState
  authz?: ReturnType<typeof makeAuthzContext>
}) => {
  const modifyPublicationDate = jest.fn().mockResolvedValue({ success: true })
  const selectedDocument = makeDoc(publicationDate, state)
  ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
    selector({ document: { selectedDocument, modifyPublicationDate } }),
  )
  ;(useSession as jest.Mock).mockReturnValue({ data: { user: { authz } } })
  return { modifyPublicationDate }
}

const theme = createTheme()

const renderComponent = (ui: ReactElement = <PublicationDate />) =>
  render(
    <I18nProvider i18n={i18n}>
      <ThemeProvider theme={theme}>
        <DateProvider>{ui}</DateProvider>
      </ThemeProvider>
    </I18nProvider>,
  )

describe('PublicationDate component', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('display', () => {
    it('shows the "no date available" message when there is no date', () => {
      setup({ publicationDate: null })
      renderComponent()
      expect(
        screen.getByText(
          i18n.t('documents_page_publication_date_column_no_date_available'),
        ),
      ).toBeInTheDocument()
    })

    it('shows an unparseable value verbatim', () => {
      setup({ publicationDate: 'in press' })
      renderComponent()
      expect(screen.getByText('in press')).toBeInTheDocument()
    })

    it('formats year, month and full-date precisions for display', () => {
      for (const value of ['2024', '2024-03', '2024-03-15']) {
        setup({ publicationDate: value })
        const { unmount } = renderComponent()
        expect(
          screen.getByText(formatPublicationDate(value, i18n.locale)),
        ).toBeInTheDocument()
        unmount()
      }
    })
  })

  describe('edit affordance (calendar icon button)', () => {
    it('renders an enabled icon button when the user may update publicationDate', () => {
      setup({ publicationDate: '2024' })
      renderComponent()
      expect(screen.getByRole('button', { name: EDIT_BTN })).toBeEnabled()
    })

    it('is hidden when the user lacks update permission for publicationDate', () => {
      setup({ publicationDate: '2024', authz: denyCtx })
      renderComponent()
      expect(
        screen.queryByRole('button', { name: EDIT_BTN }),
      ).not.toBeInTheDocument()
    })

    it('is disabled when the document is frozen', () => {
      setup({
        publicationDate: '2024',
        state: DocumentState.waiting_for_update,
      })
      renderComponent()
      expect(screen.getByRole('button', { name: EDIT_BTN })).toBeDisabled()
    })
  })

  describe('editing and serialization', () => {
    it.each([
      ['2024', '2024'],
      ['2024-03', '2024-03'],
      ['2024-03-15', '2024-03-15'],
    ])(
      'persists the existing %s value at its precision on Apply',
      async (stored, expected) => {
        const { modifyPublicationDate } = setup({ publicationDate: stored })
        renderComponent()

        fireEvent.click(screen.getByRole('button', { name: EDIT_BTN }))
        fireEvent.click(screen.getByRole('button', { name: APPLY_BTN }))

        await waitFor(() =>
          expect(modifyPublicationDate).toHaveBeenCalledWith(expected),
        )
      },
    )

    it('renders the year/month/day steps', () => {
      setup({ publicationDate: '2024-03-15' })
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: EDIT_BTN }))
      expect(
        screen.getByRole('button', { name: STEP_YEAR }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: STEP_MONTH }),
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: STEP_DAY })).toBeInTheDocument()
    })

    it.each([
      [STEP_MONTH, '2024-03'],
      [STEP_YEAR, '2024'],
    ])(
      'drops to a shallower precision when a previous step is clicked',
      async (step, expected) => {
        const { modifyPublicationDate } = setup({
          publicationDate: '2024-03-15',
        })
        renderComponent()

        fireEvent.click(screen.getByRole('button', { name: EDIT_BTN }))
        fireEvent.click(screen.getByRole('button', { name: step }))
        fireEvent.click(screen.getByRole('button', { name: APPLY_BTN }))

        await waitFor(() =>
          expect(modifyPublicationDate).toHaveBeenCalledWith(expected),
        )
      },
    )

    it('adds a deeper level via the next step', async () => {
      const { modifyPublicationDate } = setup({ publicationDate: '2024' })
      renderComponent()

      fireEvent.click(screen.getByRole('button', { name: EDIT_BTN }))
      // Year is chosen, so the Month step is enabled — advancing adds the level.
      fireEvent.click(screen.getByRole('button', { name: STEP_MONTH }))

      // MonthCalendar renders a radiogroup with one radio per (short) month name.
      await userEvent.click(screen.getByRole('radio', { name: /May/i }))

      fireEvent.click(screen.getByRole('button', { name: APPLY_BTN }))
      await waitFor(() =>
        expect(modifyPublicationDate).toHaveBeenCalledWith('2024-05'),
      )
    })

    it('shows nothing selected when entering a newly added level', () => {
      setup({ publicationDate: '2024' })
      renderComponent()

      fireEvent.click(screen.getByRole('button', { name: EDIT_BTN }))
      fireEvent.click(screen.getByRole('button', { name: STEP_MONTH }))

      // The freshly entered month grid must not pre-highlight any month.
      expect(
        screen.queryByRole('radio', { checked: true }),
      ).not.toBeInTheDocument()
    })

    it('disables the next step until the current level is chosen', () => {
      setup({ publicationDate: null })
      renderComponent()

      fireEvent.click(screen.getByRole('button', { name: EDIT_BTN }))
      // No year picked yet → the Month step cannot be reached.
      expect(screen.getByRole('button', { name: STEP_MONTH })).toBeDisabled()
    })

    it('clears the selection then saves null on Apply (no dialog)', async () => {
      const { modifyPublicationDate } = setup({ publicationDate: '2024-03-15' })
      renderComponent()

      fireEvent.click(screen.getByRole('button', { name: EDIT_BTN }))
      // The bin clears the in-popover selection (no confirmation dialog)...
      fireEvent.click(screen.getByRole('button', { name: REMOVE_BTN }))
      // ...and once cleared it disables itself.
      expect(screen.getByRole('button', { name: REMOVE_BTN })).toBeDisabled()
      // Apply with no selection persists null.
      fireEvent.click(screen.getByRole('button', { name: APPLY_BTN }))

      await waitFor(() =>
        expect(modifyPublicationDate).toHaveBeenCalledWith(null),
      )
    })

    it('disables the remove button when there is no selection', () => {
      setup({ publicationDate: null })
      renderComponent()

      fireEvent.click(screen.getByRole('button', { name: EDIT_BTN }))
      expect(screen.getByRole('button', { name: REMOVE_BTN })).toBeDisabled()
    })

    it('auto-advances to the next deeper step after each pick', async () => {
      setup({ publicationDate: null })
      renderComponent()
      fireEvent.click(screen.getByRole('button', { name: EDIT_BTN }))

      // Year grid (a radiogroup) is shown; picking a year advances to Month.
      await userEvent.click(screen.getByRole('radio', { name: '2024' }))
      const may = await screen.findByRole('radio', { name: /May/i })

      // Picking a month advances to the Day grid (role 'grid', not radiogroup).
      await userEvent.click(may)
      expect(await screen.findByRole('grid')).toBeInTheDocument()
    })
  })
})
