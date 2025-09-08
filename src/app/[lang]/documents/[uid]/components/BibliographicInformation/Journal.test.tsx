import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'

import useStore from '@/stores/global_store'
import { Journal } from '@/types/Journal'
import { JournalIdentifier } from '@/types/JournalIdentifier'
import { Document, DocumentType } from '@/types/Document'
import { Literal } from '@/types/Literal'
import JournalComponent from './Journal'

jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
}))

const document: Document = new Document(
  'doc-123',
  DocumentType.Document,
  '2022',
  new Date('2022-01-01T00:00:00.000Z'),
  new Date('2022-12-31T23:59:59.000Z'),
  [new Literal('Sample Document Title', 'en')],
  [],
  [],
  [],
  [],
  new Journal('Test journal', '0123-4567', 'Test publisher', [
    new JournalIdentifier('issn', '0123-4567', 'Online'),
  ]),
)

describe('Journal Component', () => {
  const mockState = {
    document: {
      selectedDocument: document,
    },
  }

  beforeEach(() => {
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(mockState),
    )
  })

  const renderComponent = () =>
    render(
      <I18nProvider i18n={i18n}>
        <JournalComponent />
      </I18nProvider>,
    )

  it('renders the component with the journal name', () => {
    renderComponent()

    expect(screen.getByText('Test journal')).toBeInTheDocument()
  })

  it('shows the popper with additional journal information when the button is clicked', () => {
    renderComponent()

    expect(screen.queryByText('0123-4567')).toBeNull()
    expect(screen.queryByText('Test publisher')).toBeNull()

    const button = screen.getByText('Test journal')
    fireEvent.click(button)

    expect(screen.getByText('0123-4567')).toBeInTheDocument()
    expect(screen.getByText('Test publisher')).toBeInTheDocument()
  })
})
