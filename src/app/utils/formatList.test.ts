// Tests the locale-aware list joining used in HAL collection messages
import { formatList } from '@/utils/formatList'

describe('formatList', () => {
  it.each([
    [[], 'fr', ''],
    [['LAB1'], 'fr', 'LAB1'],
    [['LAB1', 'LAB2'], 'fr', 'LAB1 et LAB2'],
    [['LAB1', 'LAB2', 'LAB3'], 'fr', 'LAB1, LAB2 et LAB3'],
    [['LAB1', 'LAB2'], 'en', 'LAB1 and LAB2'],
    [['LAB1', 'LAB2', 'LAB3'], 'en', 'LAB1, LAB2, and LAB3'],
  ])('joins %j in %s as %j', (items, locale, expected) => {
    expect(formatList(items, locale)).toBe(expected)
  })
})
