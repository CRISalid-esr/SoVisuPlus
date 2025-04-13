import { createTheme, ThemeProvider } from '@mui/material/styles'
import { fireEvent, render, screen } from '@testing-library/react'
import { I18nProvider } from '@lingui/react'
import { i18n } from '@lingui/core'
import ConceptChip from '@/app/[lang]/documents/[uid]/components/Keywords/ConceptChip'
import { Concept } from '@/types/Concept'
import { ConceptGroup } from '@/types/ConceptGroup'
import { Literal } from '@/types/Literal'

describe('ConceptChips Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const theme = createTheme({
    typography: { fontWeightRegular: 400, fontWeightMedium: 500 },
    palette: { primary: { main: '#1976d2' } },
    utils: { pxToRem: (value: number) => `${value / 16}rem` },
  })
  const group = ConceptGroup.fromConcepts([
    new Concept(
      'generated-aabb13c222746d8b2f693c6e08c297ac',
      [new Literal('Neutralité', 'ul')],
      [],
      null,
    ),
    new Concept(
      'http://www.idref.fr/027476502/id',
      [new Literal('Neutralité', 'fr')],
      [new Literal('Politique de neutralité', 'ul')],
      'http://www.idref.fr/027476502/id',
    ),
  ])

  const renderComponent = () =>
    render(
      <ThemeProvider theme={theme}>
        <I18nProvider i18n={i18n}>
          <ConceptChip group={group[0]} language='fr' />
        </I18nProvider>
      </ThemeProvider>,
    )

  it('renders back button and title', () => {
    renderComponent()
    const chip = screen.getByRole('button', {
      name: 'Neutralité',
    })
    expect(chip).toBeInTheDocument()
    fireEvent.click(chip)
    expect(screen.getByText('IDREF 027476502')).toBeInTheDocument()
    // Neutralité should be present twice, once in the button and twice in the modal
    expect(screen.getAllByText('Neutralité')).toHaveLength(3)
    expect(
      screen.getByText(i18n.t('concept_chips_free_keyword')),
    ).toBeInTheDocument()
    const chipText = screen.getByText('IDREF 027476502')
    expect(chipText.closest('a')).toHaveAttribute(
      'href',
      'http://www.idref.fr/027476502/id',
    )
    expect(
      screen.getByText(i18n.t('concept_chips_pref_label')),
    ).toBeInTheDocument()
    expect(
      screen.getByText(i18n.t('concept_chips_alt_label')),
    ).toBeInTheDocument()
    expect(screen.getByText('Politique de neutralité')).toBeInTheDocument()
  })
})
