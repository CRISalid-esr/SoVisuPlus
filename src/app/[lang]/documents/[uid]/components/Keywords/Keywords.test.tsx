import { render, screen } from '@testing-library/react'
import { I18nProvider } from '@lingui/react'
import { i18n } from '@lingui/core'
import Keywords from '@/app/[lang]/documents/[uid]/components/Keywords/Keywords'
import { makeAssignment, makeAuthzContext } from '@/app/auth/context'
import { PermissionAction, PermissionSubject } from '@/types/Permission'
import { useSession } from 'next-auth/react'
import useStore from '@/stores/global_store'
import { abilityFromAuthzContext } from '@/app/auth/ability'
import { createTheme, ThemeProvider } from '@mui/material/styles'

jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('next-auth/react', () => ({
  __esModule: true,
  useSession: jest.fn(),
}))

const authz = makeAuthzContext({
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

const mockState = {
  document: {
    fetchDocumentById: jest.fn(),
    loading: false,
    selectedDocument: document,
    addConcepts: jest.fn(),
  },
  user: {
    currentPerspective: {
      person: {
        id: '1',
        firstName: 'First',
        lastName: 'Last',
        type: 'people',
        slug: 'person:local-me',
      },
    },
    connectedUser: {
      person: {
        id: '1',
        firstName: 'First',
        lastName: 'Last',
        type: 'people',
        slug: 'person:local-me',
      },
    },
  },
}

const theme = createTheme({
  typography: { fontWeightRegular: 400, fontWeightMedium: 500 },
  palette: { primary: { main: '#1976d2' } },
  utils: { pxToRem: (value: number) => `${value / 16}rem` },
})

describe('Keywords Component', () => {
  beforeEach(() => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { authz: authz } },
    })
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(mockState),
    )
    expect(() => abilityFromAuthzContext(authz)).not.toThrow()
    jest.clearAllMocks()
  })

  it("Check that unauthorized user can't see the autocomplete field", async () => {
    render(
      <ThemeProvider theme={theme}>
        <I18nProvider i18n={i18n}>
          <Keywords />
        </I18nProvider>
      </ThemeProvider>,
    )

    const comboBox = screen.queryByRole('combobox')
    expect(comboBox).not.toBeInTheDocument()
  })
})
