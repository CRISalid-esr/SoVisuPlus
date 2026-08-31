import { computeEffectiveHidden } from '@/lib/services/organizationVisibility'

const unit = (uid: string, hidden = false) => ({ uid, hidden })
const link = (childUid: string, parentUid: string) => ({ childUid, parentUid })

describe('computeEffectiveHidden', () => {
  it('hides nothing when no structure is explicitly hidden', () => {
    const hidden = computeEffectiveHidden(
      [unit('inst'), unit('lab')],
      [link('lab', 'inst')],
    )
    expect([...hidden]).toEqual([])
  })

  it('hides a root only when it is explicitly hidden', () => {
    const hidden = computeEffectiveHidden(
      [unit('inst', true), unit('other')],
      [],
    )
    expect([...hidden].sort()).toEqual(['inst'])
  })

  it('cascades down a chain of single-parent structures', () => {
    const hidden = computeEffectiveHidden(
      [unit('inst', true), unit('lab'), unit('team')],
      [link('lab', 'inst'), link('team', 'lab')],
    )
    expect([...hidden].sort()).toEqual(['inst', 'lab', 'team'])
  })

  it('keeps a child that still has a visible parent', () => {
    const hidden = computeEffectiveHidden(
      [unit('inst', true), unit('other'), unit('lab')],
      [link('lab', 'inst'), link('lab', 'other')],
    )
    expect([...hidden].sort()).toEqual(['inst'])
  })

  it('hides a child once every one of its parents is hidden', () => {
    const hidden = computeEffectiveHidden(
      [unit('inst', true), unit('other', true), unit('lab'), unit('team')],
      [link('lab', 'inst'), link('lab', 'other'), link('team', 'lab')],
    )
    expect([...hidden].sort()).toEqual(['inst', 'lab', 'other', 'team'])
  })

  it('hides a descendant reached through a hidden intermediate only', () => {
    // inst (hidden) ─ div ─ team, plus a lab hanging off a visible root
    const hidden = computeEffectiveHidden(
      [
        unit('inst', true),
        unit('div'),
        unit('team'),
        unit('root'),
        unit('lab'),
      ],
      [
        link('div', 'inst'),
        link('team', 'div'),
        link('lab', 'root'),
        link('team', 'lab'),
      ],
    )
    // team also hangs off lab, which is visible
    expect([...hidden].sort()).toEqual(['div', 'inst'])
  })

  it('keeps an explicitly hidden structure hidden inside a visible parent', () => {
    const hidden = computeEffectiveHidden(
      [unit('inst'), unit('lab', true)],
      [link('lab', 'inst')],
    )
    expect([...hidden].sort()).toEqual(['lab'])
  })

  it('does not hide a cycle nothing explicitly hides', () => {
    const hidden = computeEffectiveHidden(
      [unit('a'), unit('b')],
      [link('a', 'b'), link('b', 'a')],
    )
    expect([...hidden]).toEqual([])
  })

  it('ignores relationships toward unknown or self structures', () => {
    const hidden = computeEffectiveHidden(
      [unit('inst', true), unit('lab')],
      [link('lab', 'ghost'), link('lab', 'lab'), link('lab', 'inst')],
    )
    expect([...hidden].sort()).toEqual(['inst', 'lab'])
  })
})
