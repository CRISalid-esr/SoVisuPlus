import { OAStatus } from '@prisma/client'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { render, screen, act } from '@testing-library/react'
import { Document, DocumentType } from '@/types/Document'
import OAStatusCell from '@/app/[lang]/documents/components/OAStatusCell'

beforeEach(() => {
  act(() => {
    i18n.activate('en')
  })
})

const mockRow = (oaType?: OAStatus, upwType?: OAStatus) => {
  const mockDocument = new Document(
    'doc1',
    DocumentType.Document,
    oaType ? oaType : null,
    '2024-01-01',
    new Date('2024-01-01'),
    new Date('2024-01-01'),
    upwType ? upwType : null,
    [],
    [],
    [],
    [],
    [],
  )
  return {
    original: mockDocument,
  }
}

describe('OAStatusCell Component', () => {
  it('should display OAStatusCellBadge with upwOAStatus type if provided', async () => {
    render(
      <I18nProvider i18n={i18n}>
        <OAStatusCell row={mockRow(OAStatus.GREEN, OAStatus.DIAMOND)} />
      </I18nProvider>,
    )
    const chip = screen.getByText('DIAMOND')
    expect(chip).toBeInTheDocument()
    expect(screen.queryByText('GREEN')).not.toBeInTheDocument()
  })

  it('should display OAStatusCellBadge with oaStatus type if upwOAStatus not provided', async () => {
    render(
      <I18nProvider i18n={i18n}>
        <OAStatusCell row={mockRow(OAStatus.GREEN)} />
      </I18nProvider>,
    )
    const chip = screen.getByText('GREEN')
    expect(chip).toBeInTheDocument()
  })

  it('should display OAStatusCellBadge with UNKNOWN type if both oaStatus and upwOAStatus are not provided', async () => {
    render(
      <I18nProvider i18n={i18n}>
        <OAStatusCell row={mockRow()} />
      </I18nProvider>,
    )
    const chip = screen.getByText('UNKNOWN')
    expect(chip).toBeInTheDocument()
  })
})
