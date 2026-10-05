import { createLatestRequest, isAbortError } from './latestRequest'

describe('createLatestRequest', () => {
  it('aborts the previous request when a new one starts', () => {
    const start = createLatestRequest()
    const first = start()
    expect(first.signal.aborted).toBe(false)

    const second = start()

    expect(first.signal.aborted).toBe(true)
    expect(second.signal.aborted).toBe(false)
  })

  it('keeps separate sequences independent', () => {
    const people = createLatestRequest()
    const organizations = createLatestRequest()
    const person = people()

    organizations()

    expect(person.signal.aborted).toBe(false)
  })
})

describe('isAbortError', () => {
  it('recognises abort errors only', () => {
    expect(isAbortError(new DOMException('aborted', 'AbortError'))).toBe(true)
    expect(isAbortError({ name: 'AbortError' })).toBe(true)
    expect(isAbortError(new Error('network'))).toBe(false)
    expect(isAbortError(null)).toBe(false)
  })
})
