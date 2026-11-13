// Tests the list joining used in HAL collection messages
import { joinWithConjunction } from '@/utils/joinWithConjunction'

describe('joinWithConjunction', () => {
  it.each([
    [[], ''],
    [['LAB1'], 'LAB1'],
    [['LAB1', 'LAB2'], 'LAB1 et LAB2'],
    [['LAB1', 'LAB2', 'LAB3'], 'LAB1, LAB2 et LAB3'],
  ])('joins %j as %j', (items, expected) => {
    expect(joinWithConjunction(items, 'et')).toBe(expected)
  })
})
