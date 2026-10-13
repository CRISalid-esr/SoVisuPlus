import { render } from '@testing-library/react'
import { PersonIdentifierType } from '@/types/PersonIdentifier'
import IdentifierIconList from './IdentifierIconList'

const iconTypes = (identifiers: [PersonIdentifierType, string][]) => {
  const { container } = render(
    <IdentifierIconList
      identifiers={identifiers.map(([type, value]) => ({ type, value }))}
    />,
  )
  return [...container.querySelectorAll('img')].map((img) => img.alt)
}

describe('IdentifierIconList', () => {
  it('shows only the idhals when an idhali is also present', () => {
    expect(
      iconTypes([
        [PersonIdentifierType.idhali, '307'],
        [PersonIdentifierType.idhals, 'marie-curie'],
      ]),
    ).toEqual(['idhals'])
  })

  it('shows the idhali when there is no idhals', () => {
    expect(iconTypes([[PersonIdentifierType.idhali, '307']])).toEqual([
      'idhali',
    ])
  })

  it('keeps the other identifiers next to the idhals', () => {
    expect(
      iconTypes([
        [PersonIdentifierType.idhali, '307'],
        [PersonIdentifierType.idhals, 'marie-curie'],
        [PersonIdentifierType.idref, '02725030X'],
        [PersonIdentifierType.orcid, '0000-0002-0756-0508'],
      ]),
    ).toEqual(['orcid', 'idref', 'idhals'])
  })
})
