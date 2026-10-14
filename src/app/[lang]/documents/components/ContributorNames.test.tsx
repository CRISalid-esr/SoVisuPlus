// Tests the contributor names list: shared identity card on hover and
// rendering limited to the first names while collapsed
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import ContributorNames from '@/app/[lang]/documents/components/ContributorNames'
import { Contribution } from '@/types/Contribution'
import { Document, DocumentType } from '@/types/Document'
import { Person } from '@/types/Person'

jest.mock('@/app/[lang]/documents/components/ContributorIdentityCard', () => ({
  __esModule: true,
  default: ({ contributor }: { contributor: Contribution }) => (
    <div data-testid='identity-card'>{contributor.person.uid}</div>
  ),
}))

const makeDocument = (count: number) =>
  new Document(
    'doc-1',
    DocumentType.Document,
    null,
    null,
    null,
    null,
    null,
    [],
    [],
    [],
    Array.from(
      { length: count },
      (_, i) =>
        new Contribution(
          new Person(`person-${i}`, false, null, null, `First${i}`, `Last${i}`),
        ),
    ),
  )

const renderNames = (document: Document) =>
  render(
    <I18nProvider i18n={i18n}>
      <ContributorNames document={document} searchWords={[]} />
    </I18nProvider>,
  )

describe('ContributorNames', () => {
  beforeAll(() => {
    i18n.load('en', {})
    i18n.activate('en')
  })

  it('shows the identity card of the hovered contributor', async () => {
    renderNames(makeDocument(2))

    await userEvent.hover(screen.getByText('First0 Last0'))
    expect(await screen.findByTestId('identity-card')).toHaveTextContent(
      'person-0',
    )

    await userEvent.hover(screen.getByText('First1 Last1'))
    expect(await screen.findByTestId('identity-card')).toHaveTextContent(
      'person-1',
    )
  })

  it('renders only the first names until expanded', async () => {
    renderNames(makeDocument(40))

    expect(screen.getByText('First29 Last29')).toBeInTheDocument()
    expect(screen.queryByText('First30 Last30')).not.toBeInTheDocument()

    await userEvent.click(screen.getByText(/see_more_contributors/))

    expect(screen.getByText('First39 Last39')).toBeInTheDocument()
  })
})
