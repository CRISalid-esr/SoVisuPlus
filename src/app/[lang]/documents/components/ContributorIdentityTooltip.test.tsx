// Tests that hovering the wrapped element shows the contributor identity card
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ContributorIdentityTooltip from '@/app/[lang]/documents/components/ContributorIdentityTooltip'
import { Contribution } from '@/types/Contribution'
import { Document, DocumentType } from '@/types/Document'
import { Person } from '@/types/Person'

jest.mock('@/app/[lang]/documents/components/ContributorIdentityCard', () => ({
  __esModule: true,
  default: ({ contributor }: { contributor: Contribution }) => (
    <div data-testid='identity-card'>{contributor.person.uid}</div>
  ),
}))

const contribution = new Contribution(
  new Person('person-1', false, null, 'John Doe', 'John', 'Doe'),
)
const document = new Document(
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
  [contribution],
)

describe('ContributorIdentityTooltip', () => {
  it('shows the identity card on hover', async () => {
    render(
      <ContributorIdentityTooltip
        contribution={contribution}
        document={document}
      >
        <span>John Doe</span>
      </ContributorIdentityTooltip>,
    )

    expect(screen.queryByTestId('identity-card')).not.toBeInTheDocument()

    await userEvent.hover(screen.getByText('John Doe'))

    expect(await screen.findByTestId('identity-card')).toHaveTextContent(
      'person-1',
    )
  })
})
