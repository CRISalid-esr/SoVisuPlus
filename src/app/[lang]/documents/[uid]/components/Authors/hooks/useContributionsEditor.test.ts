import { act, renderHook } from '@testing-library/react'
import useStore from '@/stores/global_store'
import { Contribution } from '@/types/Contribution'
import { Document, DocumentState, DocumentType } from '@/types/Document'
import { LocRelator } from '@/types/LocRelator'
import { Person } from '@/types/Person'
import { useContributionsEditor } from './useContributionsEditor'

jest.mock('@/stores/global_store', () => ({
  __esModule: true,
  default: jest.fn(),
}))

const contribution = (uid: string) =>
  new Contribution(
    new Person(uid, false, null, `Name ${uid}`, 'First', 'Last'),
    [LocRelator.AUTHOR],
    [],
    null,
  )

const makeDocument = (
  contributions: Contribution[],
  state: DocumentState = DocumentState.default,
) =>
  new Document(
    'd1',
    DocumentType.Document,
    null,
    null,
    null,
    null,
    null,
    [],
    [],
    [],
    contributions,
    [],
    state,
  )

describe('useContributionsEditor', () => {
  beforeEach(() => {
    const state = {
      document: {
        saveContributions: jest.fn(),
        setContributionsTabDirty: jest.fn(),
      },
    }
    ;(useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(state),
    )
  })

  it('keeps the edited contributions when only the document state changes', () => {
    const contributions = [contribution('p1')]
    const { result, rerender } = renderHook(
      ({ document }) => useContributionsEditor(document),
      { initialProps: { document: makeDocument(contributions) } },
    )
    act(() => result.current.addContribution())
    expect(result.current.working).toHaveLength(2)

    // What the store does after a save: same contributions, frozen document.
    rerender({
      document: makeDocument(contributions, DocumentState.waiting_for_update),
    })

    expect(result.current.isFrozen).toBe(true)
    expect(result.current.working).toHaveLength(2)
  })

  it('rebuilds the contributions when a refreshed document comes back', () => {
    const { result, rerender } = renderHook(
      ({ document }) => useContributionsEditor(document),
      { initialProps: { document: makeDocument([contribution('p1')]) } },
    )
    act(() => result.current.addContribution())

    rerender({
      document: makeDocument([contribution('p1'), contribution('p2')]),
    })

    expect(result.current.working.map((item) => item.personUid)).toEqual([
      'p1',
      'p2',
    ])
  })
})
