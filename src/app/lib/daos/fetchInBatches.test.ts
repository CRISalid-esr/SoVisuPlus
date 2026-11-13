// Tests the cursor pagination helper used to stay under the bind variables limit.
import { batchPageArgs, fetchInBatches } from './fetchInBatches'

const rows = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => ({ id: from + i }))

describe('fetchInBatches', () => {
  it('returns an empty list when the first page is empty', async () => {
    const fetchPage = jest.fn().mockResolvedValue([])
    await expect(fetchInBatches(fetchPage, 2)).resolves.toEqual([])
    expect(fetchPage).toHaveBeenCalledTimes(1)
    expect(fetchPage).toHaveBeenCalledWith(undefined, 2)
  })

  it('stops after a single incomplete page', async () => {
    const fetchPage = jest.fn().mockResolvedValue(rows(1, 1))
    await expect(fetchInBatches(fetchPage, 2)).resolves.toEqual(rows(1, 1))
    expect(fetchPage).toHaveBeenCalledTimes(1)
  })

  it('follows the cursor from page to page', async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(rows(1, 2))
      .mockResolvedValueOnce(rows(3, 4))
      .mockResolvedValueOnce([])
    await expect(fetchInBatches(fetchPage, 2)).resolves.toEqual(rows(1, 4))
    expect(fetchPage.mock.calls).toEqual([
      [undefined, 2],
      [2, 2],
      [4, 2],
    ])
  })
})

describe('batchPageArgs', () => {
  it('builds the first page arguments without cursor', () => {
    expect(batchPageArgs(undefined, 10)).toEqual({
      orderBy: { id: 'asc' },
      take: 10,
    })
  })

  it('skips the cursor row on next pages', () => {
    expect(batchPageArgs(5, 10)).toEqual({
      orderBy: { id: 'asc' },
      take: 10,
      cursor: { id: 5 },
      skip: 1,
    })
  })
})
