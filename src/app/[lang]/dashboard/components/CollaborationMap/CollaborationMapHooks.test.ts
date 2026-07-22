import { renderHook } from '@testing-library/react'
import { useFilteredData } from '@/app/[lang]/dashboard/components/CollaborationMap/CollaborationMapHooks'
import { DashboardDocumentData } from '@/types/DashboardDocumentData'

const affiliation = (uid: string, name: string) => ({
  uid,
  displayNames: [name],
  places: [{ latitude: 48.85, longitude: 2.35 }],
})

/**
 * One document co-signed by a member of the perspective (`insider`) and an
 * outside co-author (`outsider`), each with their own affiliation.
 */
const documents: Record<number, DashboardDocumentData[]> = {
  2022: [
    {
      uid: 'doc-1',
      oaStatus: null,
      publicationDate: '2022-01-01',
      upwOAStatus: null,
      contributions: [
        {
          person: { uid: 'insider', displayName: 'Insider' },
          affiliations: [affiliation('own-lab', 'Own Lab')],
        },
        {
          person: { uid: 'outsider', displayName: 'Outsider' },
          affiliations: [affiliation('partner-lab', 'Partner Lab')],
        },
      ],
    },
  ],
}

const filtered = (perimeterUids: string[], yearRange: [number, number] = [2020, 2023]) =>
  renderHook(() => useFilteredData({ data: documents, yearRange, perimeterUids }))
    .result.current

describe('useFilteredData', () => {
  it('keeps affiliations of contributors outside the perimeter', () => {
    const result = filtered(['insider'])

    expect(result.map((a) => a.uid)).toEqual(['partner-lab'])
    expect(result[0].name).toBe('Partner Lab')
    expect(Object.keys(result[0].documents)).toEqual(['doc-1'])
  })

  it('excludes affiliations of contributors inside the perimeter', () => {
    expect(filtered(['insider']).map((a) => a.uid)).not.toContain('own-lab')
  })

  // Regression: institution / team / other_structure perspectives used to fall
  // through the perspective-type branches and render an empty map. The
  // perimeter is now the only input, so a multi-person perimeter — which is
  // what any organization perspective produces — behaves like any other.
  it('works for a perimeter spanning several people', () => {
    const result = filtered(['insider', 'someone-else'])

    expect(result.map((a) => a.uid)).toEqual(['partner-lab'])
  })

  it('treats everyone as a collaborator when nobody is in the perimeter', () => {
    // Both contributors are outside a perimeter of unrelated people.
    expect(filtered(['unrelated']).map((a) => a.uid)).toEqual([
      'own-lab',
      'partner-lab',
    ])
  })

  it('returns nothing while the perimeter has not loaded', () => {
    expect(filtered([])).toEqual([])
  })

  it('ignores documents outside the year range', () => {
    expect(filtered(['insider'], [2023, 2024])).toEqual([])
  })
})
