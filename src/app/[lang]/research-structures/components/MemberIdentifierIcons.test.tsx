import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { MemberIdentifierIcons } from './StructureMembersTable'

// Tests the green outline marking validated identifiers in the members table.
i18n.load('en', {})
i18n.activate('en')

const renderIcons = (
  identifiers: { type: string; value: string; validated: boolean }[],
) =>
  render(
    <I18nProvider i18n={i18n}>
      <MemberIdentifierIcons identifiers={identifiers} />
    </I18nProvider>,
  )

describe('MemberIdentifierIcons', () => {
  it('outlines only validated identifiers', () => {
    renderIcons([
      { type: 'orcid', value: '0000-0001-2345-6789', validated: true },
      { type: 'idref', value: '123456789', validated: false },
    ])
    const outlined = screen.getAllByTestId('member-identifier-validated')
    expect(outlined).toHaveLength(1)
    expect(outlined[0]).toContainElement(screen.getByAltText('ORCID'))
  })

  it('mentions the validation in the tooltip', async () => {
    renderIcons([
      { type: 'orcid', value: '0000-0001-2345-6789', validated: true },
    ])
    await userEvent.hover(screen.getByAltText('ORCID'))
    expect(
      await screen.findByText(
        'ORCID : 0000-0001-2345-6789 (identifier_validated_tooltip)',
      ),
    ).toBeInTheDocument()
  })

  it('renders no outline when nothing is validated', () => {
    renderIcons([{ type: 'idref', value: '123456789', validated: false }])
    expect(
      screen.queryByTestId('member-identifier-validated'),
    ).not.toBeInTheDocument()
  })
})
