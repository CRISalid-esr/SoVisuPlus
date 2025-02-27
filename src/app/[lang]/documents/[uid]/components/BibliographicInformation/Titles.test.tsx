import { messages as enMessages } from '@/locales/en/messages'
import { messages as frMessages } from '@/locales/fr/messages'
import useStore from '@/stores/global_store'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import Titles from './Titles'

import { Contribution } from '@/types/Contribution'
import { Document, DocumentType } from '@/types/Document'
import { Literal } from '@/types/Literal'
import { LocRelator } from '@/types/LocRelator'
import { Person } from '@/types/Person'
import '@testing-library/jest-dom'

// Mock Zustand store
jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
}))

// Mock Lingui `t` function
jest.mock('@lingui/macro', () => ({
  t: (key: string) => key, // Return key directly for testing
}))

// Mock MUI Theme
jest.mock('@mui/material/styles', () => ({
  ...jest.requireActual('@mui/material/styles'),
  useTheme: () => ({
    palette: { primary: { main: '#1976d2' } },
    spacing: (factor: number) => `${factor * 8}px`,
    utils: { pxToRem: (value: number) => `${value / 16}rem` },
    typography: { fontWeightMedium: 500 },
  }),
}))

// Mock LanguageChips component
jest.mock('../../../../components/LanguageChips', () => ({
  LanguageChips: ({
    onLanguageSelect,
  }: {
    onLanguageSelect: (lang: string) => void
  }) => <button onClick={() => onLanguageSelect('fr')}>French</button>,
}))

// Initialize Lingui i18n
i18n.load({ en: enMessages, fr: frMessages })
i18n.activate('en')

const document: Document = new Document(
  'doc-123',
  DocumentType.Document,
  '2022',
  new Date('2022-01-01T00:00:00.000Z'),
  new Date('2022-12-31T23:59:59.000Z'),
  [
    new Literal('Sample Document Title', 'en'),
    new Literal('Sample Abstract', 'fr'),
  ],
  [new Literal('Sample Abstract', 'fr')],
  [], // empty subjects
  [
    new Contribution(
      new Person(
        'person-1',
        false,
        'john@example.com',
        'John Doe',
        'John',
        'Doe',
        [],
      ),
      [LocRelator.AUTHOR_OF_INTRODUCTION__ETC_],
    ),
  ],
)

// Mock document data
const mockState = {
  document: {
    selectedDocument: document,
  },
}

describe('Titles Component', () => {
  beforeEach(() => {
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(mockState),
    )
  })

  const theme = createTheme({
    typography: { fontWeightMedium: 500 },
    palette: { primary: { main: '#1976d2' } },
    utils: { pxToRem: (value: number) => `${value / 16}rem` },
  })

  const renderComponent = () =>
    render(
      <ThemeProvider theme={theme}>
        <I18nProvider i18n={i18n}>
          <Titles />
        </I18nProvider>
      </ThemeProvider>,
    )

  it('renders title label and default language title', () => {
    renderComponent()

    expect(
      screen.getByText('document_details_page_titles_row_label'),
    ).toBeInTheDocument()
    expect(screen.getByText('Sample Document Title')).toBeInTheDocument()
  })

  it('updates title when language is changed', () => {
    renderComponent()

    // Initial title in English
    expect(screen.getByText('Sample Document Title')).toBeInTheDocument()

    // Simulate language selection
    fireEvent.click(screen.getByText('French'))

    // Updated title should be in French
    expect(screen.getByText('Sample Abstract')).toBeInTheDocument()
  })

  it('displays fallback text when no title is available', () => {
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({ document: { selectedDocument: { titles: [] } } }),
    )

    renderComponent()

    expect(
      screen.getByText('document_details_page_no_title_available'),
    ).toBeInTheDocument()
  })
})
